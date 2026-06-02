import type { Tag } from "../types";

type Props = {
  tags: Tag[];
  activeTagIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
  onDeleteTag: (tagId: string) => void;
};

export function TagFilter({ tags, activeTagIds, onToggle, onClear, onDeleteTag }: Props) {
  if (tags.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        No tags yet. Create one by adding it to a prompt, or use the global "+" in the
        banner.
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
        return (
          <span key={tag.id} className="inline-flex items-stretch overflow-hidden rounded-full text-xs">
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
              onClick={() => onDeleteTag(tag.id)}
              aria-label={`Delete tag ${tag.name}`}
              title={`Delete tag ${tag.name}`}
              className={
                active
                  ? "bg-blue-700 px-2 text-white hover:bg-blue-800"
                  : "bg-slate-300 px-2 text-slate-600 hover:bg-red-500 hover:text-white dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-red-600"
              }
            >
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
