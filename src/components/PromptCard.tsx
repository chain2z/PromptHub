import { useRef, useState } from "react";
import type { Prompt, SearchField, Tag } from "../types";

type Props = {
  prompt: Prompt;
  tags: Tag[];
  matchedField?: SearchField;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onOpenTagDropdown: (anchor: DOMRect) => void;
};

const FIELD_LABEL: Record<SearchField, string> = {
  name: "Name",
  description: "Description",
  content: "Content",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PromptCard({
  prompt,
  tags,
  matchedField,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
  onOpenTagDropdown,
}: Props) {
  const [justCopied, setJustCopied] = useState(false);
  const plusBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleCopy = async () => {
    onCopy();
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  const tagsById = new Map(tags.map((t) => [t.id, t]));
  const assignedTags = prompt.tagIds
    .map((id) => tagsById.get(id))
    .filter((t): t is Tag => Boolean(t));

  return (
    <article className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {prompt.name}
            </h3>
            {matchedField && (
              <span
                title={`Matched in ${FIELD_LABEL[matchedField]}`}
                className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
              >
                {FIELD_LABEL[matchedField]}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {prompt.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={prompt.isFavorite ? "Remove from favorites" : "Mark as favorite"}
          aria-pressed={prompt.isFavorite}
          title={prompt.isFavorite ? "Remove from favorites" : "Mark as favorite"}
          className={
            prompt.isFavorite
              ? "shrink-0 rounded-full p-1.5 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/30"
              : "shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={prompt.isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="mb-3 mt-2 flex flex-wrap items-center gap-1.5">
        {assignedTags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            {tag.name}
          </span>
        ))}
        <button
          ref={plusBtnRef}
          type="button"
          onClick={() => {
            const rect = plusBtnRef.current?.getBoundingClientRect();
            if (rect) onOpenTagDropdown(rect);
          }}
          aria-label="Add or remove tags"
          title="Add or remove tags"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-400 dark:hover:text-blue-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Edited {formatDate(prompt.updatedAt)}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy prompt content"
            className={
              justCopied
                ? "inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
                : "inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            }
          >
            {justCopied ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit prompt"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete prompt"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-600 dark:hover:bg-red-900/30"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
