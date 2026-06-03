import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FavoriteFilter } from "./components/FavoriteFilter";
import { PromptCard } from "./components/PromptCard";
import { PromptForm, type PromptFormValues } from "./components/PromptForm";
import { SearchBar } from "./components/SearchBar";
import { SortControl } from "./components/SortControl";
import { TagCreatePopover } from "./components/TagCreatePopover";
import { TagDropdown } from "./components/TagDropdown";
import { TagFilter } from "./components/TagFilter";
import { ThemeToggle } from "./components/ThemeToggle";
import { Toast } from "./components/Toast";
import { copyText } from "./lib/clipboard";
import { getStore } from "./lib/db";
import { exportToFile, importFromFile } from "./lib/importExport";
import { searchPrompts } from "./lib/search";
import { applyTheme, readTheme, writeTheme } from "./lib/theme";
import type { Prompt, SearchField, SortMode, Tag, Theme } from "./types";

type TagDropdownTarget = {
  promptId: string;
  anchor: DOMRect;
};

export function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const [theme, setTheme] = useState<Theme>("light");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);

  const [tagDropdown, setTagDropdown] = useState<TagDropdownTarget | null>(null);
  const [tagCreateAnchor, setTagCreateAnchor] = useState<DOMRect | null>(null);
  const globalAddTagBtnRef = useRef<HTMLButtonElement | null>(null);

  // ---------- init ----------
  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const store = await getStore();
        const snap = await store.loadAll();
        if (!mounted) return;
        setPrompts(snap.prompts);
        setTags(snap.tags);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Failed to load vault:", err);
        if (mounted) setLoadError(msg);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ---------- theme ----------
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    writeTheme(next);
    applyTheme(next);
  };

  // ---------- mutations ----------
  const handleCreate = useCallback(async (values: PromptFormValues) => {
    const store = await getStore();
    const created = await store.createPrompt({ ...values, isFavorite: false });
    setPrompts((prev) => [created, ...prev]);
    setFormOpen(false);
    setEditing(null);
    setToast("Prompt created");
  }, []);

  const handleUpdate = useCallback(
    async (id: string, values: PromptFormValues) => {
      const store = await getStore();
      const updated = await store.updatePrompt(id, values);
      setPrompts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setFormOpen(false);
      setEditing(null);
      setToast("Prompt updated");
    },
    []
  );

  const handleSubmitForm = useCallback(
    async (values: PromptFormValues) => {
      if (editing) await handleUpdate(editing.id, values);
      else await handleCreate(values);
    },
    [editing, handleCreate, handleUpdate]
  );

  const handleDelete = (prompt: Prompt) => {
    setConfirm({
      title: "Delete prompt?",
      message: `"${prompt.name}" will be permanently removed. This cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        const store = await getStore();
        await store.deletePrompt(prompt.id);
        setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
        setConfirm(null);
        setToast("Prompt deleted");
      },
    });
  };

  const handleCopy = async (prompt: Prompt) => {
    try {
      await copyText(prompt.content);
      setToast("Copied to clipboard");
    } catch (err) {
      console.error(err);
      setToast("Copy failed");
    }
  };

  const handleCreateTag = useCallback(
    async (name: string): Promise<Tag> => {
      const store = await getStore();
      const tag = await store.createTag(name);
      setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
      return tag;
    },
    []
  );

  const handleToggleFavorite = useCallback(async (prompt: Prompt) => {
    const store = await getStore();
    const updated = await store.setFavorite(prompt.id, !prompt.isFavorite);
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? updated : p)));
  }, []);

  const handleRenameTag = useCallback(async (tagId: string, name: string) => {
    try {
      const store = await getStore();
      const updated = await store.renameTag(tagId, name);
      setTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)));
      setToast(`Tag renamed to "${updated.name}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rename failed";
      setToast(msg);
      throw err;
    }
  }, []);

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;
    setConfirm({
      title: "Delete tag?",
      message: `Tag "${tag.name}" will be removed from all prompts. The prompts themselves will not be deleted.`,
      destructive: true,
      onConfirm: async () => {
        const store = await getStore();
        await store.deleteTag(tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        setPrompts((prev) =>
          prev.map((p) => ({
            ...p,
            tagIds: p.tagIds.filter((id) => id !== tagId),
          }))
        );
        setActiveTagIds((prev) => prev.filter((id) => id !== tagId));
        setConfirm(null);
        setToast("Tag deleted");
      },
    });
  };

  const handleSetPromptTags = useCallback(
    async (promptId: string, tagIds: string[]) => {
      const store = await getStore();
      await store.setPromptTags(promptId, tagIds);
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === promptId
            ? { ...p, tagIds: [...tagIds], updatedAt: new Date().toISOString() }
            : p
        )
      );
      setToast("Tags updated");
    },
    []
  );

  const handleExport = async () => {
    try {
      const path = await exportToFile();
      if (path) setToast(`Exported`);
    } catch (err) {
      console.error(err);
      setToast("Export failed");
    }
  };

  const handleImport = async () => {
    try {
      const summary = await importFromFile();
      if (!summary) return;
      const store = await getStore();
      const snap = await store.loadAll();
      setPrompts(snap.prompts);
      setTags(snap.tags);
      setToast(
        `Imported ${summary.imported} prompt${summary.imported === 1 ? "" : "s"}` +
          (summary.skipped > 0
            ? `, skipped ${summary.skipped} duplicate${
                summary.skipped === 1 ? "" : "s"
              }`
            : "")
      );
    } catch (err) {
      console.error(err);
      setToast("Import failed");
    }
  };

  // ---------- derived view ----------
  const favoriteCount = useMemo(
    () => prompts.filter((p) => p.isFavorite).length,
    [prompts]
  );

  const filteredByTagsAndFavorites = useMemo(() => {
    let list = prompts;
    if (favoritesOnly) list = list.filter((p) => p.isFavorite);
    if (activeTagIds.length > 0) {
      list = list.filter((p) => activeTagIds.every((id) => p.tagIds.includes(id)));
    }
    return list;
  }, [prompts, activeTagIds, favoritesOnly]);

  const visible = useMemo<{
    items: { prompt: Prompt; matchedField?: SearchField }[];
    relevanceMode: boolean;
  }>(() => {
    const trimmed = query.trim();
    // Favorites always sort first; secondary sort depends on mode.
    const favFirst = (a: Prompt, b: Prompt) =>
      Number(b.isFavorite) - Number(a.isFavorite);

    if (trimmed) {
      const results = searchPrompts(filteredByTagsAndFavorites, trimmed);
      // searchPrompts already sorts by relevance desc; re-sort with stable
      // pass to bubble favorites to the top while preserving relevance within
      // each bucket.
      results.sort((a, b) => favFirst(a.prompt, b.prompt));
      return {
        items: results.map((r) => ({ prompt: r.prompt, matchedField: r.field })),
        relevanceMode: true,
      };
    }
    const sorted = [...filteredByTagsAndFavorites];
    if (sortMode === "recent") {
      sorted.sort((a, b) => {
        const f = favFirst(a, b);
        if (f !== 0) return f;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    } else {
      sorted.sort((a, b) => {
        const f = favFirst(a, b);
        if (f !== 0) return f;
        return a.name.localeCompare(b.name);
      });
    }
    return { items: sorted.map((p) => ({ prompt: p })), relevanceMode: false };
  }, [filteredByTagsAndFavorites, query, sortMode]);

  const toggleActiveTag = (id: string) => {
    setActiveTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const openTagDropdownForPrompt = (promptId: string, anchor: DOMRect) => {
    setTagDropdown({ promptId, anchor });
  };

  const openTagCreatePopover = () => {
    const rect = globalAddTagBtnRef.current?.getBoundingClientRect();
    if (rect) setTagCreateAnchor(rect);
  };

  const dropdownInitialSelected = useMemo(() => {
    if (!tagDropdown) return [];
    const p = prompts.find((x) => x.id === tagDropdown.promptId);
    return p?.tagIds ?? [];
  }, [tagDropdown, prompts]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* ===== Banner ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Prompt Vault</h1>
          </div>

          <div className="ml-2 min-w-[16rem] flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>

          <button
            ref={globalAddTagBtnRef}
            type="button"
            onClick={openTagCreatePopover}
            title="Create a new tag"
            aria-label="Create a new tag"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Tag
          </button>

          <button
            type="button"
            onClick={handleImport}
            title="Import JSON"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Import
          </button>
          <button
            type="button"
            onClick={handleExport}
            title="Export JSON"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Export
          </button>

          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create New Prompt
          </button>
        </div>
      </header>

      {/* ===== Body ===== */}
      <main className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteFilter
              active={favoritesOnly}
              count={favoriteCount}
              onToggle={() => setFavoritesOnly((v) => !v)}
            />
            <TagFilter
              tags={tags}
              activeTagIds={activeTagIds}
              onToggle={toggleActiveTag}
              onClear={() => setActiveTagIds([])}
              onDeleteTag={handleDeleteTag}
              onRenameTag={handleRenameTag}
            />
          </div>
          <div className="flex items-center gap-3">
            <SortControl
              value={sortMode}
              onChange={setSortMode}
              disabled={visible.relevanceMode}
              disabledHint="Relevance ordering active while searching."
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {visible.items.length} of {prompts.length} prompts
            </p>
          </div>
        </div>

        {!loaded && (
          <p className="py-12 text-center text-sm text-slate-500">Loading...</p>
        )}
        {loaded && loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Failed to load vault: {loadError}
          </div>
        )}
        {loaded && !loadError && prompts.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your vault is empty. Click <strong>Create New Prompt</strong> to add
              your first one.
            </p>
          </div>
        )}
        {loaded && !loadError && prompts.length > 0 && visible.items.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No prompts match the current filters.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.items.map(({ prompt, matchedField }) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              tags={tags}
              matchedField={matchedField}
              onCopy={() => handleCopy(prompt)}
              onEdit={() => {
                setEditing(prompt);
                setFormOpen(true);
              }}
              onDelete={() => handleDelete(prompt)}
              onToggleFavorite={() => handleToggleFavorite(prompt)}
              onOpenTagDropdown={(anchor) => openTagDropdownForPrompt(prompt.id, anchor)}
            />
          ))}
        </div>
      </main>

      {/* ===== Overlays ===== */}
      <PromptForm
        open={formOpen}
        initial={editing ?? undefined}
        allTags={tags}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmitForm}
        onCreateTag={handleCreateTag}
      />

      <TagDropdown
        open={tagDropdown !== null}
        anchorRect={tagDropdown?.anchor ?? null}
        allTags={tags}
        initialSelected={dropdownInitialSelected}
        onCancel={() => setTagDropdown(null)}
        onCreateTag={handleCreateTag}
        onConfirm={async (selected) => {
          const target = tagDropdown;
          setTagDropdown(null);
          if (!target) return;
          await handleSetPromptTags(target.promptId, selected);
        }}
      />

      <TagCreatePopover
        open={tagCreateAnchor !== null}
        anchorRect={tagCreateAnchor}
        allTags={tags}
        onClose={() => setTagCreateAnchor(null)}
        onCreate={handleCreateTag}
        onCreated={(tag) => setToast(`Tag "${tag.name}" created`)}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        destructive={confirm?.destructive}
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm()}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
