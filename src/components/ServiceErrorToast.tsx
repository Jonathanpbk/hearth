import { useEffect } from "react";
import { CircleAlert, X } from "lucide-react";
import { useServiceErrorStore } from "../store/useServiceErrorStore";

const DISPLAY_MS = 5000;

export function ServiceErrorToast() {
  const notice = useServiceErrorStore((state) => state.notice);
  const clearError = useServiceErrorStore((state) => state.clearError);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => clearError(notice.id), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [notice, clearError]);

  if (!notice) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-1/2 top-16 z-[10000] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-red-400/25 bg-[#3a2224] px-3 py-2.5 text-sm text-red-100 shadow-xl"
    >
      <CircleAlert className="h-4 w-4 shrink-0 text-red-300" />
      <span>{notice.message}</span>
      <button
        type="button"
        onClick={() => clearError(notice.id)}
        className="ml-1 rounded p-0.5 text-red-200/60 hover:text-red-100"
        aria-label="Dismiss error"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
