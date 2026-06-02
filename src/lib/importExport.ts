import type { Prompt, Tag, ImportSummary } from "../types";
import { getStore, type VaultSnapshot } from "./db";
import { isTauri } from "./env";

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  prompts: Prompt[];
  tags: Tag[];
};

export async function buildExport(): Promise<ExportPayload> {
  const store = await getStore();
  const { prompts, tags } = await store.loadAll();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    prompts,
    tags,
  };
}

export async function exportToFile(): Promise<string | null> {
  const payload = await buildExport();
  const json = JSON.stringify(payload, null, 2);
  const fileName = `prompt-vault-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;

  if (isTauri()) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: fileName,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return null;
      await writeTextFile(path, json);
      return path;
    } catch (err) {
      console.warn("Tauri export failed, falling back to browser download:", err);
    }
  }

  // Browser: trigger a download.
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return fileName;
}

function parseSnapshot(raw: string): VaultSnapshot {
  const parsed = JSON.parse(raw);
  const prompts: Prompt[] = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
  const tags: Tag[] = Array.isArray(parsed?.tags) ? parsed.tags : [];
  const safePrompts = prompts
    .filter(
      (p): p is Prompt =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.description === "string" &&
        typeof p.content === "string"
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      content: p.content ?? "",
      tagIds: Array.isArray(p.tagIds) ? p.tagIds : [],
      createdAt: p.createdAt ?? new Date().toISOString(),
      updatedAt: p.updatedAt ?? new Date().toISOString(),
    }));
  const safeTags = tags
    .filter((t): t is Tag => t && typeof t.id === "string" && typeof t.name === "string")
    .map((t) => ({ id: t.id, name: t.name }));
  return { prompts: safePrompts, tags: safeTags };
}

export async function importFromString(raw: string): Promise<ImportSummary> {
  const snapshot = parseSnapshot(raw);
  const store = await getStore();
  return store.importSnapshot(snapshot, true);
}

export async function importFromFile(): Promise<ImportSummary | null> {
  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path || Array.isArray(path)) return null;
      const raw = await readTextFile(path as string);
      return importFromString(raw);
    } catch (err) {
      console.warn("Tauri import failed, falling back to browser picker:", err);
    }
  }

  // Browser: open a hidden file input.
  return new Promise<ImportSummary | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const summary = await importFromString(text);
        resolve(summary);
      } catch (err) {
        reject(err);
      } finally {
        input.remove();
      }
    };
    input.oncancel = () => {
      resolve(null);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}
