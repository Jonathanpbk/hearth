import { useEffect, useRef, useState } from "react";
import { startWebRTCStream } from "../../lib/webrtc";
import { startMSEStream, stopMSEStream } from "../../lib/mse";
import type { WebRTCSession } from "../../lib/webrtc";
import type { StreamMode } from "../../store/useCameraStore";

interface Props {
  go2rtcUrl: string;
  streamName: string;
  mode: StreamMode;
}

type VideoState = "connecting" | "playing" | "fallback" | "error";

const PLAYBACK_FALLBACK_MS = 8000;
const DISCONNECT_FALLBACK_MS = 3000;

export function WebRTCVideo({ go2rtcUrl, streamName, mode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcRef = useRef<WebRTCSession | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [videoState, setVideoState] = useState<VideoState>("connecting");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !go2rtcUrl || !streamName) return;

    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let removeConnectionListener: (() => void) | null = null;
    setVideoState("connecting");

    function clearFallbackTimer() {
      if (!fallbackTimer) return;
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    function stopPrimaryStream() {
      removeConnectionListener?.();
      removeConnectionListener = null;
      rtcRef.current?.stop();
      rtcRef.current = null;
      if (wsRef.current) {
        stopMSEStream(wsRef.current, video!);
        wsRef.current = null;
      }
    }

    function showFallback(stopPrimary = false) {
      if (cancelled) return;
      clearFallbackTimer();
      if (stopPrimary) stopPrimaryStream();
      setVideoState("fallback");
    }

    function scheduleFallback(delay: number) {
      clearFallbackTimer();
      fallbackTimer = setTimeout(() => showFallback(false), delay);
    }

    function handlePlaying() {
      if (cancelled) return;
      clearFallbackTimer();
      setVideoState("playing");
    }

    function handleVideoError() {
      showFallback(false);
    }

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleVideoError);
    scheduleFallback(PLAYBACK_FALLBACK_MS);

    async function start() {
      try {
        if (mode === "webrtc") {
          const session = await startWebRTCStream(go2rtcUrl, streamName, video!);
          if (cancelled) { session.stop(); return; }
          rtcRef.current = session;

          const onConnectionState = () => {
            if (cancelled) return;
            if (session.pc.connectionState === "connected") {
              if (video!.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                handlePlaying();
              }
            } else if (
              session.pc.connectionState === "failed" ||
              session.pc.connectionState === "closed"
            ) {
              showFallback(true);
            } else if (session.pc.connectionState === "disconnected") {
              scheduleFallback(DISCONNECT_FALLBACK_MS);
            }
          };

          session.pc.addEventListener("connectionstatechange", onConnectionState);
          removeConnectionListener = () =>
            session.pc.removeEventListener("connectionstatechange", onConnectionState);

          if (
            session.pc.connectionState === "connected" &&
            video!.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            handlePlaying();
          }
        } else {
          const ws = await startMSEStream(go2rtcUrl, streamName, video!);
          if (cancelled) { stopMSEStream(ws, video!); return; }
          wsRef.current = ws;
        }
      } catch {
        showFallback(true);
      }
    }

    void start();

    return () => {
      cancelled = true;
      clearFallbackTimer();
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleVideoError);
      stopPrimaryStream();
    };
  }, [go2rtcUrl, streamName, mode]);

  const mjpegSrc = `${go2rtcUrl.replace(/\/$/, "")}/api/stream.mjpeg?src=${encodeURIComponent(streamName)}`;

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-contain transition-opacity ${
          videoState === "fallback" || videoState === "error" ? "opacity-0" : "opacity-100"
        }`}
      />
      {videoState === "connecting" && (
        <p role="status" className="absolute text-sm text-white/50">
          Connecting to camera
        </p>
      )}
      {videoState === "fallback" && (
        <img
          src={mjpegSrc}
          alt={streamName}
          onError={() => setVideoState("error")}
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}
      {videoState === "error" && (
        <p role="alert" className="absolute text-sm text-white/60">
          Camera stream unavailable
        </p>
      )}
    </>
  );
}
