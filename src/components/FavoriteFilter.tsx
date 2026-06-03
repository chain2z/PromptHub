type Props = {
  active: boolean;
  count: number;
  onToggle: () => void;
};

export function FavoriteFilter({ active, count, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={active ? "Show all prompts" : "Show favorites only"}
      className={
        active
          ? "inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white"
          : "inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      Favorites
      {count > 0 && (
        <span
          className={
            active
              ? "rounded-full bg-white/30 px-1.5 text-[10px] font-semibold"
              : "rounded-full bg-slate-300 px-1.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-200"
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}
