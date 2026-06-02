# Prompt Vault

A lightweight desktop application that stores and manages a personal library of
AI prompts. Fast search, scannable cards, instant copy-to-clipboard. Runs as a
native desktop app via Tauri and also as a plain web app for rapid iteration.

## Features

- Create / edit / delete prompts with name, description, content, and tags.
- Weighted real-time search (Name > Description > Content) with a field-match
  badge per result.
- Multi-tag AND filtering, combined with the active search query.
- Sort by recent (default) or alphabetical; relevance ordering takes over while
  searching.
- Per-card actions: Copy (with toast + checkmark), Edit, Delete (with
  confirmation), and a scrollable "+" tag dropdown with a Confirm button that
  saves tag assignments immediately.
- Global tag management from the banner.
- JSON import (merge/append, skip duplicates by name) and export.
- Dark/light theme toggle, persisted across launches.
- Fully offline. SQLite is the source of truth in the desktop build; the
  browser build transparently falls back to localStorage.

## Prerequisites

- **Node.js** v18+ and **npm** v9+.
- **Rust** (stable) toolchain via [rustup](https://rustup.rs/) — only needed
  for the Tauri desktop build.
- On Windows, Tauri requires
  [Microsoft Edge WebView2](https://developer.microsoft.com/microsoft-edge/webview2/),
  which is pre-installed on Windows 10/11.

## Setup

```bash
npm install
```

## Run in browser (fastest iteration)

```bash
npm run dev
```

Opens at <http://localhost:1420>. Data persists in `localStorage` under the key
`prompt-vault::data::v1`. Theme is persisted under `prompt-vault::theme`.

## Run as a Tauri desktop app

```bash
npm run tauri:dev
```

The first run compiles the Rust shell, which takes several minutes. Subsequent
runs are fast. Data is stored in SQLite at
`%APPDATA%\com.promptvault.app\vault.db` (Windows) /
`~/Library/Application Support/com.promptvault.app/vault.db` (macOS) /
`~/.local/share/com.promptvault.app/vault.db` (Linux).

## Build production binaries

```bash
npm run tauri:build
```

Produces native installers for the current platform under
`src-tauri/target/release/bundle/`.

## Project layout

```
src/
  components/   React components
  lib/          Data access (db), search, clipboard, theme, import/export
  types/        TypeScript types
  App.tsx       App shell, state, and orchestration
  main.tsx      Entry point
src-tauri/      Tauri shell (Rust)
```

The `lib/db.ts` data-access layer abstracts SQLite vs. localStorage behind a
single `DataStore` interface so storage can evolve without touching the UI.

## Data model

```ts
type Tag = { id: string; name: string };
type Prompt = {
  id: string;
  name: string;
  description: string;
  content: string;
  tagIds: string[];
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
};
```

Deleting a tag removes it from all prompts that had it but **does not delete
any prompts**.

## Search ranking

1. **Name** — exact / prefix / substring matches rank highest.
2. **Description** — next priority.
3. **Content** — lowest priority.

Each result carries a small badge indicating which field matched. Search runs
in-memory over the loaded snapshot — instant, no DB round-trip per keystroke.

## Import / export format

```json
{
  "version": 1,
  "exportedAt": "ISO timestamp",
  "prompts": [ ... ],
  "tags": [ ... ]
}
```

Import is **additive**: existing data is preserved, prompts with the same name
(case-insensitive) are skipped, and a summary count is shown.
