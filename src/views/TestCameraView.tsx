import { useState } from "react";
import { useCameraStore } from "../store/useCameraStore";

const GO2RTC_URL = "http://192.168.0.69:1984";
const STREAMS = ["doorbell", "driveway"];
const MODES = ["webrtc", "mse", "mjpeg"] as const;
type StreamMode = (typeof MODES)[number];

export function TestCameraView() {
  const [stream, setStream] = useState(STREAMS[0]);
  const [mode, setMode] = useState<StreamMode>("webrtc");
  const triggerOverlay = useCameraStore((s) => s.trigger);
  // Key forces iframe remount when stream/mode changes so the player restarts cleanly
  const [key, setKey] = useState(0);

  const playerUrl = `${GO2RTC_URL}/stream.html?src=${stream}&mode=${mode}&muted=1`;

  function apply() {
    setKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold">Camera Test</h1>
          <p className="text-xs text-white/30 mt-0.5">{GO2RTC_URL}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Stream picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 uppercase tracking-widest">Stream</span>
            <div className="flex gap-1">
              {STREAMS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStream(s)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    stream === s
                      ? "bg-white/10 text-white"
                      : "text-white/35 hover:text-white/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Mode picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 uppercase tracking-widest">Mode</span>
            <div className="flex gap-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium uppercase tracking-wide transition-colors ${
                    mode === m
                      ? "bg-white/10 text-white"
                      : "text-white/35 hover:text-white/70"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={apply}
            className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-400 transition-colors"
          >
            Load
          </button>
        </div>

        {/* Player — overflow-hidden clips the go2rtc control bar */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
          {key > 0 && (
            <iframe
              key={key}
              src={playerUrl}
              title={`${stream} — ${mode}`}
              className="test-camera-iframe"
              allow="autoplay"
            />
          )}
          {key === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
              Press Load to start
            </div>
          )}
        </div>

        {/* URL readout */}
        {key > 0 && (
          <p className="text-xs text-white/25 break-all">{playerUrl}</p>
        )}

        {/* Overlay triggers — test the fullscreen camera overlay */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Overlay test</p>
          <div className="flex gap-2">
            <button
              onClick={() => triggerOverlay({ camera_stream: "doorbell", mode: "webrtc", duration: 15000 })}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/8 hover:bg-white/15 text-white/70 transition-colors"
            >
              Doorbell (WebRTC)
            </button>
            <button
              onClick={() => triggerOverlay({ camera_stream: "driveway", mode: "mse", duration: 15000 })}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/8 hover:bg-white/15 text-white/70 transition-colors"
            >
              Driveway (MSE)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
