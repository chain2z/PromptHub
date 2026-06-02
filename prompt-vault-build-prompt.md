# Build Prompt: Personal AI Prompt Vault

You are an expert full-stack engineer. Scaffold a complete, working **frame/skeleton** of the project described below in one shot. Build clean, modular, production-quality code that runs immediately. I will refine finer details afterward, so structure everything for non-destructive, piece-by-piece extension.

---

## 1. What to Build

A lightweight desktop application that stores and manages a personal library of AI prompts, optimized for fast search, high scannability, and instant copy-to-clipboard. It runs on localhost in a browser during development and compiles to a native desktop executable with **no architectural changes**.

## 2. Tech Stack (use exactly this)

- **Desktop shell:** Tauri (v2) — lightweight bundle, native SQLite + clipboard.
- **Frontend:** React + TypeScript + Vite.
- **Styling:** Tailwind CSS.
- **Database:** SQLite via `@tauri-apps/plugin-sql` (with migrations).
- **Clipboard:** `@tauri-apps/plugin-clipboard-manager`.
- **Search:** custom weighted scorer in TypeScript (no search library).

The app must run via `npm run tauri dev` (desktop) and the frontend must also boot via `npm run dev` (browser localhost) for rapid iteration. **No cloud, no external server, no internet dependency** for any core feature.

> If any browser-only path cannot reach the Tauri SQLite/clipboard plugins, abstract those behind an interface in `lib/` with a graceful in-memory/localStorage fallback for `npm run dev`, while the Tauri build uses the real plugins. Do not let this fork the UI logic.

## 3. Scope Boundary

**Build now (this frame):**
- Full project scaffold, build config, and Tauri shell that compiles.
- SQLite schema + migrations + data-access layer.
- Dashboard with prompt cards, weighted search, multi-tag AND filtering, sort options.
- Create / Edit / Delete prompt flows (with delete confirmation).
- Global tag management (create, assign, delete) + banner "+" tag dropdown.
- Copy-to-clipboard with toast + button checkmark.
- Dark/light theme toggle (persisted).
- JSON import/export.

**Leave for later (stub or omit cleanly — do NOT implement):**
- Prompt templating / dynamic variables.
- Fuzzy/typo-tolerant search.
- Tag colors, folders, favorites, sharing, sync, auth.
- Settings page beyond the theme toggle.

## 4. Data Model

```ts
type Tag = {
  id: string;            // uuid
  name: string;          // unique, case-insensitive
};

type Prompt = {
  id: string;            // uuid
  name: string;          // required
  description: string;   // required
  content: string;       // required (raw text copied verbatim)
  tagIds: string[];      // many-to-many via join table
  createdAt: string;     // ISO 8601 UTC
  updatedAt: string;     // ISO 8601 UTC
};
```

SQLite tables: `prompts`, `tags`, `prompt_tags` (join: `prompt_id`, `tag_id`, FK with `ON DELETE CASCADE`). Deleting a tag removes its rows from `prompt_tags` only — **prompts are never deleted when a tag is deleted**, they just lose that tag.

## 5. Functional Requirements

### A. Prompt Create / Edit
- Prominent **"Create New Prompt"** button on the dashboard.
- Form fields: **Name** (required), **Description** (required), **Content** (required, multiline textarea), **Tags** (optional, multi-select from existing global tags + create-on-the-fly).
- Required fields validated before save; block save with inline errors if empty.
- On save, set/refresh `updatedAt`; set `createdAt` on first create.

### B. Dashboard (main screen)
- Card/banner layout, clean and scannable.
- Each card shows: **Name**, **Description**, **assigned Tags** (only tags currently assigned to that prompt), and **last-edited date** rendered in the local machine timezone.
- Per-card actions:
  - **Copy** — copies `content` verbatim. On success show a small **"Copied to clipboard"** toast AND a temporary checkmark state on the button (revert after ~1.5s). No other popups.
  - **Edit** — opens the prompt in the edit view.
  - **Delete** — opens a confirmation dialog; only removes on confirm.
  - **"+" (add tag)** — opens a **scrollable dropdown** listing all global tags as a selection box with a **Confirm** button. Confirming saves the tag assignment **immediately** to that prompt (no need to open the full edit view).

### C. Search (weighted, real-time)
- Single global search bar, queries as you type.
- Match priority, sorted by relevance, strict order: **1) Name, 2) Description, 3) Content.**
- Output is a single flat list sorted by relevance, and each result must **indicate which field matched** (e.g., a small badge: "Name" / "Description" / "Content").
- All search runs in-memory over loaded state (instant, no DB round-trip per keystroke).

### D. Tag Filtering
- Tags on the dashboard are clickable filters.
- **Multiple tags can be active at once, combined with AND** (a prompt must have all active tags to show).
- **Search and tag filters apply together** (AND): results must satisfy the active tag set *and* the search query.
- Clear/active state for filters must be visible and dismissible.

### E. Sort
- Sort control with options: **Recent** (by `updatedAt`, newest first) and **Alphabetical** (by name). Recent is the default. Sorting applies when no search query overrides relevance ordering; while a query is active, relevance ordering wins.

### F. Import / Export
- **Export:** dump entire vault (prompts + tags) to a JSON file.
- **Import:** read a JSON file and **merge/append** into the existing vault. **Skip exact duplicates by name** and show a summary count (imported / skipped). Do not wipe existing data.

### G. Theme
- **Dark and light** themes with a toggle. Persist the choice locally and restore on launch.

## 6. Architecture & Data Flow

```
src/
  components/
    PromptCard.tsx
    PromptForm.tsx
    SearchBar.tsx
    TagFilter.tsx
    TagDropdown.tsx        // the banner "+" selection box + confirm
    SortControl.tsx
    ConfirmDialog.tsx
    Toast.tsx
    ThemeToggle.tsx
  lib/
    db.ts                  // data-access layer; abstracts SQLite vs fallback
    search.ts              // weighted scoring + field-match labeling
    clipboard.ts           // clipboard abstraction
    importExport.ts
    theme.ts
  types/
    index.ts               // Prompt, Tag, etc.
  App.tsx
  main.tsx
src-tauri/
  ...                      // Rust shell, migrations, plugin config
```

- **SQLite is the source of truth.** On startup, load all prompts + tags into React state once. Search, filtering, and sorting operate **in-memory** for instant response.
- **Mutations** (create/edit/delete/tag-assign/import) write to SQLite first, then update in-memory state.
- Keep all DB access behind `lib/db.ts` so storage can evolve without touching UI. Keep clipboard behind `lib/clipboard.ts`.

## 7. Conventions

- TypeScript strict mode on; no `any` in core logic.
- Functional React components + hooks; lift shared state to `App` or a small context — no external state library needed.
- All dates stored as ISO 8601 UTC; format to local timezone only at render.
- UUIDs for all IDs. Tag names unique case-insensitively.
- Modular, additive structure: new features should slot in as new components/`lib` modules without rewriting existing data hooks or core UI flow.
- Include a `README.md` with setup, `npm run dev`, `npm run tauri dev`, and build instructions, plus required toolchain (Node, Rust).

## 8. Acceptance Criteria

1. `npm install` then `npm run tauri dev` launches a working desktop app; `npm run dev` boots the same UI in the browser.
2. I can create a prompt with name/description/content/tags; required fields are validated.
3. Dashboard shows cards with name, description, assigned tags, and last-edited date in local time.
4. Copy button copies content verbatim and shows both a "Copied to clipboard" toast and a button checkmark.
5. Edit updates the prompt and refreshes `updatedAt`; Delete asks for confirmation before removing.
6. The "+" button on a card opens a scrollable tag dropdown with a Confirm button, and confirming assigns the tag immediately.
7. Search returns a relevance-sorted flat list (Name > Description > Content) with a field-match badge per result.
8. Selecting multiple tags filters with AND logic, and an active search + active tags apply together.
9. Sort offers Recent (default) and Alphabetical; relevance ordering takes over while searching.
10. Export produces a JSON backup; import merges/appends, skips name duplicates, and reports counts.
11. Theme toggle switches dark/light and persists across restarts.
12. Deleting a tag removes it from all prompts that had it but deletes no prompts.
13. All core features work fully offline with no external/cloud calls.
14. Code is modular per the layout above so features can be added without breaking storage or core UI.

If any requirement is technically impossible or self-conflicting, flag it in a `NOTES.md` rather than silently guessing.
