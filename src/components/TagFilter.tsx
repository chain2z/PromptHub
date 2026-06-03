import { useEffect, useRef, useState } from "react";
import type { Tag } from "../types";

type Props = {
  tags: Tag[];
  activeTagIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
  onDeleteTag: (tagId: string) => void;
  onRenameTag: (tagId: string, name: string) => Promise<void>;
};

export function TagFilter({
  tags,
  activeTagIds,
  onToggle,
  onClear,
  onDeleteTag,
  onRenameTag,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (tags.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        No tags yet. Create one with the New Tag button in the banner, or add tags
        when editing a prompt.
      </p>
    );
  }
  const activeSet = new Set(activeTagIds);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Filter
      </span>
      {tags.map((tag) => {
        const active = activeSet.has(tag.id);
        if (editingId === tag.id) {
          return (
            <TagRenameInput
              key={tag.id}
              tag={tag}
              onCancel={() => setEditingId(null)}
              onSave={async (name) => {
                await onRenameTag(tag.id, name);
                setEditingId(null);
              }}
            />
          );
        }
        return (
          <span
            key={tag.id}
            className="group inline-flex items-stretch overflow-hidden rounded-full text-xs"
          >
            <button
              type="button"
              onClick={() => onToggle(tag.id)}
              aria-pressed={active}
              className={
                active
                  ? "bg-blue-600 px-3 py-1 font-medium text-white"
                  : "bg-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              }
            >
              {tag.name}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(tag.id)}
              aria-label={`Rename tag ${tag.name}`}
              title={`Rename tag ${tag.name}`}
              className={
                "w-0 overflow-hidden opacity-0 transition-all group-hover:w-6 group-hover:opacity-100 focus:w-6 focus:opacity-100 " +
                (active
                  ? "bg-blue-700 text-white hover:bg-blue-800"
                  : "bg-slate-300 text-slate-600 hover:bg-blue-500 hover:text-white dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-blue-600")
              }
            >
              <span className="flex h-full w-6 items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteTag(tag.id)}
              aria-label={`Delete tag ${tag.name}`}
              title={`Delete tag ${tag.name}`}
              className={
                "w-0 overflow-hidden opacity-0 transition-all group-hover:w-6 group-hover:opacity-100 focus:w-6 focus:opacity-100 " +
                (active
                  ? "bg-blue-700 text-white hover:bg-red-600"
                  : "bg-slate-300 text-slate-600 hover:bg-red-500 hover:text-white dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-red-600")
              }
            >
              <span className="flex h-full w-6 items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          </span>
        );
      })}
      {activeTagIds.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Clear ({activeTagIds.length})
        </button>
      )}
    </div>
  );
}

function TagRenameInput({
  tag,
  onSave,
  onCancel,
}: {
  tag: Tag;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(tag.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    if (trimmed === tag.name) {
      onCancel();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
      setSubmitting(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs ring-2 ring-blue-500/40 dark:bg-slate-700">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={submitting}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={submit}
        className="w-24 bg-transparent text-xs focus:outline-none"
        size={Math.max(8, value.length + 1)}
      />
      {error && (
        <span
          title={error}
          className="text-[10px] font-medium text-red-600 dark:text-red-400"
        >
          !
        </span>
      )}
    </span>
  );
}
