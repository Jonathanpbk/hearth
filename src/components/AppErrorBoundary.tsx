import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import {
  claimAutomaticRuntimeRecovery,
  getRuntimeRecoveryUrl,
  isChunkLoadError,
} from "../lib/runtime-recovery";
import { RuntimeLoading } from "./RuntimeLoading";

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
  recovering: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, recovering: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, recovering: false };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("Hearth encountered a runtime error", error, errorInfo);

    if (
      claimAutomaticRuntimeRecovery(
        error,
        window.sessionStorage,
        Date.now(),
        navigator.onLine
      )
    ) {
      this.setState({ recovering: true });
      window.location.replace(getRuntimeRecoveryUrl());
    }
  }

  private retry = () => {
    window.location.reload();
  };

  private update = () => {
    window.location.assign("/api/pwa-update.html");
  };

  render() {
    if (this.state.recovering) {
      return <RuntimeLoading message="Refreshing Hearth." />;
    }

    if (!this.state.error) return this.props.children;

    const chunkFailure = isChunkLoadError(this.state.error);
    return (
      <main
        role="alert"
        className="h-full w-full flex items-center justify-center bg-[var(--color-bg)] p-6"
      >
        <section className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[var(--color-surface)] p-6 text-center shadow-2xl">
          <TriangleAlert
            className="mx-auto h-8 w-8 text-amber-400"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-semibold text-white">
            Hearth needs to reload
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            {chunkFailure
              ? "Part of Hearth failed to load. Your saved settings and dashboard layout are still stored."
              : "Hearth encountered an error. Your saved settings and dashboard layout are still stored."}
          </p>
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={this.retry}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              onClick={this.update}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-4 py-3 text-sm text-white/70 hover:border-white/20 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Update Hearth
            </button>
          </div>
        </section>
      </main>
    );
  }
}
