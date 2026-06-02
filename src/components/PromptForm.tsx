import { useEffect, useRef, useState } from "react";
import type { Prompt, Tag } from "../types";

export type PromptFormValues = {
  name: string;
  description: string;
  content: string;
  tagIds: string[];
};

type Props = {
  open: boolean;
  initial?: Prompt;
  allTags: Tag[];
  onCancel: () => void;
  onSubmit: (values: PromptFormValues) => Promise<void>;
  onCreateTag: (name: string) => Promise<Tag>;
};

const EMPTY: PromptFormValues = {
  name: "",
  description: "",
  content: "",
  tagIds: [],
};

export function PromptForm({ open, initial, allTags, onCancel, onSubmit, onCreateTag }: Props) {
  const [values, setValues] = useState<PromptFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof PromptFormValues, string>>>({});
  const [newTagText, setNewTagText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              name: initial.name,
              description: initial.description,
              content: initial.content,
              tagIds: [...initial.tagIds],
            }
          : EMPTY
      );
      setErrors({});
      setNewTagText("");
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!values.description.trim()) next.description = "Description is required.";
    if (!values.content.trim()) next.content = "Content is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        description: values.description.trim(),
        content: values.content,
        tagIds: values.tagIds,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (id: string) => {
    setValues((v) => ({
      ...v,
      tagIds: v.tagIds.includes(id)
        ? v.tagIds.filter((t) => t !== id)
        : [...v.tagIds, id],
    }));
  };

  const handleCreateTag = async () => {
    const name = newTagText.trim();
    if (!name) return;
    const tag = await onCreateTag(name);
    setValues((v) => ({
      ...v,
      tagIds: v.tagIds.includes(tag.id) ? v.tagIds : [...v.tagIds, tag.id],
    }));
    setNewTagText("");
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-800"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit Prompt" : "New Prompt"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <label htmlFor="prompt-name" className="mb-1 block text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="prompt-name"
              ref={nameRef}
              type="text"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="prompt-description"
              className="mb-1 block text-sm font-medium"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="prompt-description"
              type="text"
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="prompt-content" className="mb-1 block text-sm font-medium">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="prompt-content"
              rows={10}
              value={values.content}
              onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700"
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.content}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tags</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {allTags.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No tags yet — create one below.
                </p>
              )}
              {allTags.map((tag) => {
                const selected = values.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    }
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                placeholder="Create a new tag..."
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={!newTagText.trim()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : initial ? "Save changes" : "Create prompt"}
          </button>
        </footer>
      </form>
    </div>
  );
}
