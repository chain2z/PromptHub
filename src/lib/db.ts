import type { Prompt, Tag } from "../types";
import { isTauri } from "./env";
import { uuid } from "./uuid";

export type VaultSnapshot = {
  prompts: Prompt[];
  tags: Tag[];
};

export interface DataStore {
  init(): Promise<void>;
  loadAll(): Promise<VaultSnapshot>;
  createPrompt(input: Omit<Prompt, "id" | "createdAt" | "updatedAt">): Promise<Prompt>;
  updatePrompt(id: string, patch: Partial<Omit<Prompt, "id" | "createdAt">>): Promise<Prompt>;
  deletePrompt(id: string): Promise<void>;
  setPromptTags(promptId: string, tagIds: string[]): Promise<void>;
  setFavorite(promptId: string, isFavorite: boolean): Promise<Prompt>;
  createTag(name: string): Promise<Tag>;
  renameTag(id: string, name: string): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  importSnapshot(snapshot: VaultSnapshot, skipDuplicateNames: boolean): Promise<{
    imported: number;
    skipped: number;
    importedTags: number;
  }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTagName(name: string): string {
  return name.trim();
}

function sameTagName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ============ Tauri SQLite store ============
class SqliteStore implements DataStore {
  private db: any = null;

  async init(): Promise<void> {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    this.db = await Database.load("sqlite:vault.db");
  }

  async loadAll(): Promise<VaultSnapshot> {
    const tagRows = (await this.db.select("SELECT id, name FROM tags")) as Array<{
      id: string;
      name: string;
    }>;
    const promptRows = (await this.db.select(
      "SELECT id, name, description, content, is_favorite as isFavorite, created_at as createdAt, updated_at as updatedAt FROM prompts"
    )) as Array<Omit<Prompt, "tagIds" | "isFavorite"> & { isFavorite: number | boolean }>;
    const linkRows = (await this.db.select(
      "SELECT prompt_id as promptId, tag_id as tagId FROM prompt_tags"
    )) as Array<{ promptId: string; tagId: string }>;
    const tagsByPrompt = new Map<string, string[]>();
    for (const l of linkRows) {
      const list = tagsByPrompt.get(l.promptId) ?? [];
      list.push(l.tagId);
      tagsByPrompt.set(l.promptId, list);
    }
    const prompts: Prompt[] = promptRows.map((p) => ({
      ...p,
      isFavorite: Boolean(p.isFavorite),
      tagIds: tagsByPrompt.get(p.id) ?? [],
    }));
    return { prompts, tags: tagRows };
  }

  async createPrompt(input: Omit<Prompt, "id" | "createdAt" | "updatedAt">): Promise<Prompt> {
    const id = uuid();
    const now = nowIso();
    await this.db.execute(
      "INSERT INTO prompts (id, name, description, content, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, input.name, input.description, input.content, input.isFavorite ? 1 : 0, now, now]
    );
    for (const tagId of input.tagIds) {
      await this.db.execute(
        "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
        [id, tagId]
      );
    }
    return { id, ...input, createdAt: now, updatedAt: now };
  }

  async updatePrompt(
    id: string,
    patch: Partial<Omit<Prompt, "id" | "createdAt">>
  ): Promise<Prompt> {
    const existingRows = (await this.db.select(
      "SELECT id, name, description, content, is_favorite as isFavorite, created_at as createdAt, updated_at as updatedAt FROM prompts WHERE id = ?",
      [id]
    )) as Array<Omit<Prompt, "tagIds" | "isFavorite"> & { isFavorite: number | boolean }>;
    const existing = existingRows[0];
    if (!existing) throw new Error("Prompt not found");
    const now = nowIso();
    const next = {
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      content: patch.content ?? existing.content,
      isFavorite: patch.isFavorite ?? Boolean(existing.isFavorite),
    };
    await this.db.execute(
      "UPDATE prompts SET name = ?, description = ?, content = ?, is_favorite = ?, updated_at = ? WHERE id = ?",
      [next.name, next.description, next.content, next.isFavorite ? 1 : 0, now, id]
    );
    if (patch.tagIds) {
      await this.setPromptTags(id, patch.tagIds);
    }
    const linkRows = (await this.db.select(
      "SELECT tag_id as tagId FROM prompt_tags WHERE prompt_id = ?",
      [id]
    )) as Array<{ tagId: string }>;
    return {
      id,
      ...next,
      createdAt: existing.createdAt,
      updatedAt: now,
      tagIds: linkRows.map((r) => r.tagId),
    };
  }

  async setFavorite(promptId: string, isFavorite: boolean): Promise<Prompt> {
    return this.updatePrompt(promptId, { isFavorite });
  }

  async renameTag(id: string, name: string): Promise<Tag> {
    const trimmed = normalizeTagName(name);
    if (!trimmed) throw new Error("Tag name cannot be empty");
    const conflict = (await this.db.select(
      "SELECT id, name FROM tags WHERE LOWER(name) = LOWER(?) AND id != ?",
      [trimmed, id]
    )) as Tag[];
    if (conflict[0]) {
      throw new Error(`A tag named "${trimmed}" already exists.`);
    }
    await this.db.execute("UPDATE tags SET name = ? WHERE id = ?", [trimmed, id]);
    return { id, name: trimmed };
  }

  async deletePrompt(id: string): Promise<void> {
    await this.db.execute("DELETE FROM prompt_tags WHERE prompt_id = ?", [id]);
    await this.db.execute("DELETE FROM prompts WHERE id = ?", [id]);
  }

  async setPromptTags(promptId: string, tagIds: string[]): Promise<void> {
    await this.db.execute("DELETE FROM prompt_tags WHERE prompt_id = ?", [promptId]);
    for (const tagId of tagIds) {
      await this.db.execute(
        "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
        [promptId, tagId]
      );
    }
  }

  async createTag(name: string): Promise<Tag> {
    const trimmed = normalizeTagName(name);
    if (!trimmed) throw new Error("Tag name cannot be empty");
    const existing = (await this.db.select(
      "SELECT id, name FROM tags WHERE LOWER(name) = LOWER(?)",
      [trimmed]
    )) as Tag[];
    if (existing[0]) return existing[0];
    const id = uuid();
    await this.db.execute("INSERT INTO tags (id, name) VALUES (?, ?)", [id, trimmed]);
    return { id, name: trimmed };
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.execute("DELETE FROM prompt_tags WHERE tag_id = ?", [id]);
    await this.db.execute("DELETE FROM tags WHERE id = ?", [id]);
  }

  async importSnapshot(snapshot: VaultSnapshot, skipDuplicateNames: boolean) {
    const existing = await this.loadAll();
    const existingPromptNames = new Set(
      existing.prompts.map((p) => p.name.trim().toLowerCase())
    );
    // Map source tagId -> destination tagId
    const tagIdMap = new Map<string, string>();
    let importedTags = 0;
    for (const t of snapshot.tags) {
      const match = existing.tags.find((et) => sameTagName(et.name, t.name));
      if (match) {
        tagIdMap.set(t.id, match.id);
      } else {
        const created = await this.createTag(t.name);
        tagIdMap.set(t.id, created.id);
        importedTags++;
      }
    }
    let imported = 0;
    let skipped = 0;
    for (const p of snapshot.prompts) {
      if (skipDuplicateNames && existingPromptNames.has(p.name.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      const mappedTagIds = p.tagIds
        .map((tid) => tagIdMap.get(tid))
        .filter((x): x is string => Boolean(x));
      await this.createPrompt({
        name: p.name,
        description: p.description,
        content: p.content,
        tagIds: mappedTagIds,
        isFavorite: Boolean(p.isFavorite),
      });
      existingPromptNames.add(p.name.trim().toLowerCase());
      imported++;
    }
    return { imported, skipped, importedTags };
  }
}

// ============ Browser localStorage fallback ============
const LS_KEY = "prompt-vault::data::v1";

class LocalStorageStore implements DataStore {
  private state: VaultSnapshot = { prompts: [], tags: [] };

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VaultSnapshot;
        if (parsed && Array.isArray(parsed.prompts) && Array.isArray(parsed.tags)) {
          // Backfill isFavorite for data saved before this field existed.
          this.state = {
            ...parsed,
            prompts: parsed.prompts.map((p) => ({
              ...p,
              isFavorite: Boolean((p as Partial<Prompt>).isFavorite),
            })),
          };
        }
      }
    } catch {
      this.state = { prompts: [], tags: [] };
    }
  }

  private flush() {
    localStorage.setItem(LS_KEY, JSON.stringify(this.state));
  }

  async loadAll(): Promise<VaultSnapshot> {
    return {
      prompts: this.state.prompts.map((p) => ({ ...p, tagIds: [...p.tagIds] })),
      tags: this.state.tags.map((t) => ({ ...t })),
    };
  }

  async createPrompt(input: Omit<Prompt, "id" | "createdAt" | "updatedAt">): Promise<Prompt> {
    const now = nowIso();
    const p: Prompt = {
      id: uuid(),
      name: input.name,
      description: input.description,
      content: input.content,
      tagIds: [...input.tagIds],
      isFavorite: Boolean(input.isFavorite),
      createdAt: now,
      updatedAt: now,
    };
    this.state.prompts.push(p);
    this.flush();
    return p;
  }

  async updatePrompt(
    id: string,
    patch: Partial<Omit<Prompt, "id" | "createdAt">>
  ): Promise<Prompt> {
    const idx = this.state.prompts.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Prompt not found");
    const now = nowIso();
    const updated: Prompt = {
      ...this.state.prompts[idx],
      ...patch,
      tagIds: patch.tagIds ? [...patch.tagIds] : this.state.prompts[idx].tagIds,
      updatedAt: now,
    };
    this.state.prompts[idx] = updated;
    this.flush();
    return updated;
  }

  async deletePrompt(id: string): Promise<void> {
    this.state.prompts = this.state.prompts.filter((p) => p.id !== id);
    this.flush();
  }

  async setPromptTags(promptId: string, tagIds: string[]): Promise<void> {
    const idx = this.state.prompts.findIndex((p) => p.id === promptId);
    if (idx < 0) return;
    this.state.prompts[idx] = {
      ...this.state.prompts[idx],
      tagIds: [...tagIds],
      updatedAt: nowIso(),
    };
    this.flush();
  }

  async setFavorite(promptId: string, isFavorite: boolean): Promise<Prompt> {
    const idx = this.state.prompts.findIndex((p) => p.id === promptId);
    if (idx < 0) throw new Error("Prompt not found");
    const next: Prompt = {
      ...this.state.prompts[idx],
      isFavorite,
      updatedAt: nowIso(),
    };
    this.state.prompts[idx] = next;
    this.flush();
    return next;
  }

  async renameTag(id: string, name: string): Promise<Tag> {
    const trimmed = normalizeTagName(name);
    if (!trimmed) throw new Error("Tag name cannot be empty");
    const conflict = this.state.tags.find(
      (t) => t.id !== id && sameTagName(t.name, trimmed)
    );
    if (conflict) {
      throw new Error(`A tag named "${trimmed}" already exists.`);
    }
    const idx = this.state.tags.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error("Tag not found");
    const next: Tag = { id, name: trimmed };
    this.state.tags[idx] = next;
    this.flush();
    return next;
  }

  async createTag(name: string): Promise<Tag> {
    const trimmed = normalizeTagName(name);
    if (!trimmed) throw new Error("Tag name cannot be empty");
    const existing = this.state.tags.find((t) => sameTagName(t.name, trimmed));
    if (existing) return existing;
    const tag: Tag = { id: uuid(), name: trimmed };
    this.state.tags.push(tag);
    this.flush();
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    this.state.tags = this.state.tags.filter((t) => t.id !== id);
    this.state.prompts = this.state.prompts.map((p) => ({
      ...p,
      tagIds: p.tagIds.filter((tid) => tid !== id),
    }));
    this.flush();
  }

  async importSnapshot(snapshot: VaultSnapshot, skipDuplicateNames: boolean) {
    const tagIdMap = new Map<string, string>();
    let importedTags = 0;
    for (const t of snapshot.tags) {
      const match = this.state.tags.find((et) => sameTagName(et.name, t.name));
      if (match) {
        tagIdMap.set(t.id, match.id);
      } else {
        const created = await this.createTag(t.name);
        tagIdMap.set(t.id, created.id);
        importedTags++;
      }
    }
    const existingNames = new Set(this.state.prompts.map((p) => p.name.trim().toLowerCase()));
    let imported = 0;
    let skipped = 0;
    for (const p of snapshot.prompts) {
      if (skipDuplicateNames && existingNames.has(p.name.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      const mappedTagIds = p.tagIds
        .map((tid) => tagIdMap.get(tid))
        .filter((x): x is string => Boolean(x));
      await this.createPrompt({
        name: p.name,
        description: p.description,
        content: p.content,
        tagIds: mappedTagIds,
        isFavorite: Boolean(p.isFavorite),
      });
      existingNames.add(p.name.trim().toLowerCase());
      imported++;
    }
    return { imported, skipped, importedTags };
  }
}

let cachedStore: DataStore | null = null;

export async function getStore(): Promise<DataStore> {
  if (cachedStore) return cachedStore;
  if (isTauri()) {
    try {
      const s = new SqliteStore();
      await s.init();
      cachedStore = s;
      return s;
    } catch (err) {
      // Fall through to localStorage if SQLite plugin is unavailable.
      console.warn("SQLite store failed to init, falling back to localStorage:", err);
    }
  }
  const fallback = new LocalStorageStore();
  await fallback.init();
  cachedStore = fallback;
  return fallback;
}
