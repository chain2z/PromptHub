export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}
