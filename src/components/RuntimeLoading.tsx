import { Loader2 } from "lucide-react";

interface Props {
  message?: string;
}

export function RuntimeLoading({ message = "Loading Hearth." }: Props) {
  return (
    <main
      role="status"
      aria-live="polite"
      className="h-full w-full flex items-center justify-center bg-[var(--color-bg)]"
    >
      <div className="flex items-center gap-3 text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p className="text-sm">{message}</p>
      </div>
    </main>
  );
}
