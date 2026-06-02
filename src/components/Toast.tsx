import { useEffect } from "react";

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, 1800);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
    >
      {message}
    </div>
  );
}
