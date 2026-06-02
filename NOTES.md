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

## Spec note: banner "+" tag dropdown

The build spec describes the banner-level "+" as opening a tag dropdown. There
is no prompt to assign to in that case, so the global control here lets you
**create or delete tags** for the whole vault. Per-card "+" buttons still open
the same dropdown scoped to that prompt and assign on Confirm. Tags can also
be deleted from the filter row (each tag chip has a small `×`).
