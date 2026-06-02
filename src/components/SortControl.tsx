import type { SortMode } from "../types";

type Props = {
  value: SortMode;
  onChange: (next: SortMode) => void;
  disabled?: boolean;
  disabledHint?: string;
};

export function SortControl({ value, onChange, disabled, disabledHint }: Props) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortMode)}
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
      >
        <option value="recent">Recent</option>
        <option value="alphabetical">Alphabetical</option>
      </select>
    </label>
  );
}
