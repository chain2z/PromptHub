import { useEffect, useMemo, useRef, useState } from "react";
import type { Tag } from "../types";

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  allTags: Tag[];
  initialSelected: string[];
  onConfirm: (tagIds: string[]) => void;
  onCancel: () => void;
  onCreateTag: (name: string) => Promise<Tag>;
};

export function TagDropdown({
  open,
  anchorRect,
  allTags,
  initialSelected,
  onConfirm,
  onCancel,
  onCreateTag,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set(initialSelected));
      setFilter("");
    }
  }, [open, initialSelected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, onCancel]);

  const filteredTags = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(f));
  }, [allTags, filter]);

  const canCreate =
    filter.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === filter.trim().toLowerCase());

  if (!open) return null;

  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: Math.min(anchorRect.bottom + 6, window.innerHeight - 320),
        left: Math.min(anchorRect.left, window.innerWidth - 280),
      }
    : { position: "fixed", top: 80, left: 80 };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const name = filter.trim();
    if (!name) return;
    const created = await onCreateTag(name);
    setSelected((prev) => new Set(prev).add(created.id));
    setFilter("");
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Select tags"
      style={style}
      className="z-50 w-72 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="border-b border-slate-200 p-2 dark:border-slate-700">
        <input
          autoFocus
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search or create tag..."
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700"
        />
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        {filteredTags.length === 0 && !canCreate && (
          <p className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
            No tags found.
          </p>
        )}
        {filteredTags.map((tag) => (
          <label
            key={tag.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <input
              type="checkbox"
              checked={selected.has(tag.id)}
              onChange={() => toggle(tag.id)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="truncate">{tag.name}</span>
          </label>
        ))}
        {canCreate && (
          <button
            type="button"
            onClick={handleCreate}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
          >
            <span aria-hidden="true">+</span>
            <span>
              Create <strong>"{filter.trim()}"</strong>
            </span>
          </button>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 p-2 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(Array.from(selected))}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
