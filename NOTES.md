# Notes

## Tauri SQLite plugin migrations

The plugin's migrations are wired in `src-tauri/src/lib.rs` and applied
automatically on first run. The schema lives there (not in JS) so it can run
under Tauri's startup.

## Browser fallback

`src/lib/db.ts` ships two implementations of the `DataStore` interface:

- `SqliteStore` — used inside Tauri (detected via `window.__TAURI_INTERNALS__`).
- `LocalStorageStore` — used in plain browser dev. Persists under the
  `prompt-vault::data::v1` key.

The UI never sees the difference. Switching between modes does **not** migrate
data — the browser build and the Tauri build use independent stores.

## Spec note: banner "New Tag" button

The banner-level button creates a new global tag. It opens a small popover
with a single text input + Create button (Enter submits, Esc closes). There's
no prompt to assign to from the banner, so a selection list there would be
inert — assignment is the job of the per-card "+" dropdown instead. Tags can
be deleted from the filter row (each tag chip has a small `×`).
