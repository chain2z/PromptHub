import { isTauri } from "./env";

export async function copyText(text: string): Promise<void> {
  if (isTauri()) {
    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(text);
      return;
    } catch (err) {
      console.warn("Tauri clipboard failed, falling back:", err);
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, falling back:", err);
    }
  }
  // Last-resort fallback for non-secure contexts or denied permissions.
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "absolute";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}
