import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useCameraStore } from "../../store/useCameraStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useDimStore } from "../../store/useDimStore";
import { WebRTCVideo } from "./WebRTCVideo";

export function CameraOverlay() {
  const visible = useCameraStore((s) => s.visible);
  const streamName = useCameraStore((s) => s.streamName);
  const streamMode = useCameraStore((s) => s.streamMode);
  const duration = useCameraStore((s) => s.duration);
  const dismiss = useCameraStore((s) => s.dismiss);
  const go2rtcUrl = useSettingsStore((s) => s.settings.go2rtcUrl);

  const undim = useDimStore((s) => s.undim);
  const progressRef = useRef<HTMLDivElement>(null);

  // Undim screen when camera appears so the overlay is fully visible.
  useEffect(() => {
    if (visible) undim();
  }, [visible, undim]);

  // rAF-driven progress bar + auto-dismiss. Runs only while visible.
  useEffect(() => {
    if (!visible) return;

    const el = progressRef.current;
    const start = performance.now();
    let rafId: number;

    function frame(now: number) {
      const elapsed = now - start;
      const remaining = Math.max(0, 1 - elapsed / duration);
      if (el) el.style.transform = `scaleX(${remaining})`;
      if (elapsed >= duration) {
        dismiss();
      } else {
        rafId = requestAnimationFrame(frame);
      }
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [visible, duration, dismiss]);

  return (
    // Always in the DOM so mounting never causes layout shifts.
    // Visibility is controlled via opacity + pointer-events.
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={dismiss}
    >
      {/* Stream — only mounted while visible to manage connection lifecycle */}
      {visible && go2rtcUrl && (
        <WebRTCVideo
          go2rtcUrl={go2rtcUrl}
          streamName={streamName}
          mode={streamMode}
        />
      )}
      {visible && !go2rtcUrl && (
        <p className="text-sm text-white/40">Camera URL not configured</p>
      )}

      {/* Dismiss button */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        aria-label="Close camera"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div ref={progressRef} className="h-full bg-white/30 origin-left" />
      </div>
    </div>
  );
}
