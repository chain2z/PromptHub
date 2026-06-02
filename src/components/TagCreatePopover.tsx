import { useEffect, useMemo, useRef, useState } from "react";
import type { Tag } from "../types";

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  allTags: Tag[];
  onCreate: (name: string) => Promise<Tag>;
  onClose: () => void;
  onCreated?: (tag: Tag) => void;
};

export function TagCreatePopover({
  open,
  anchorRect,
  allTags,
  onCreate,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  const trimmed = name.trim();
  const duplicate = useMemo(
    () =>
      trimmed.length > 0 &&
      allTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase()),
    [allTags, trimmed]
  );
  const canCreate = trimmed.length > 0 && !duplicate && !submitting;

  if (!open) return null;

  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: Math.min(anchorRect.bottom + 6, window.innerHeight - 200),
        left: Math.min(anchorRect.left, window.innerWidth - 320),
      }
    : { position: "fixed", top: 80, left: 80 };

  const submit = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      const tag = await onCreate(trimmed);
      onCreated?.(tag);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Create new tag"
      style={style}
      className="z-50 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800"
    >
      <label
        htmlFor="new-tag-name"
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        New tag
      </label>
      <input
        id="new-tag-name"
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Tag name..."
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700"
      />
      {duplicate && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          A tag named "{trimmed}" already exists.
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canCreate}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create tag"}
        </button>
      </div>
    </div>
  );
}
