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

    function showFallback() {
      if (cancelled) return;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      removeConnectionListener?.();
      removeConnectionListener = null;
      rtcRef.current?.stop();
      rtcRef.current = null;
      setVideoState("fallback");
    }

    async function start() {
      try {
        if (mode === "webrtc") {
          const session = await startWebRTCStream(go2rtcUrl, streamName, video!);
          if (cancelled) { session.stop(); return; }
          rtcRef.current = session;

          const onConnectionState = () => {
            if (cancelled) return;
            if (session.pc.connectionState === "connected") {
              if (fallbackTimer) clearTimeout(fallbackTimer);
              setVideoState("playing");
            } else if (
              session.pc.connectionState === "failed" ||
              session.pc.connectionState === "closed"
            ) {
              showFallback();
            } else if (session.pc.connectionState === "disconnected") {
              if (fallbackTimer) clearTimeout(fallbackTimer);
              fallbackTimer = setTimeout(showFallback, 3000);
            }
          };

          session.pc.addEventListener("connectionstatechange", onConnectionState);
          removeConnectionListener = () =>
            session.pc.removeEventListener("connectionstatechange", onConnectionState);

          if (session.pc.connectionState === "connected") {
            setVideoState("playing");
          } else {
            fallbackTimer = setTimeout(showFallback, 3000);
          }
        } else {
          const ws = await startMSEStream(go2rtcUrl, streamName, video!);
          if (cancelled) { stopMSEStream(ws, video!); return; }
          wsRef.current = ws;
          setVideoState("playing");
        }
      } catch {
        showFallback();
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      removeConnectionListener?.();
      if (rtcRef.current) { rtcRef.current.stop(); rtcRef.current = null; }
      if (wsRef.current) { stopMSEStream(wsRef.current, video); wsRef.current = null; }
    };
  }, [go2rtcUrl, streamName, mode]);

  const mjpegSrc = `${go2rtcUrl.replace(/\/$/, "")}/api/stream.mjpeg?src=${encodeURIComponent(streamName)}`;

  function handleVideoError() {
    setVideoState((state) => state === "fallback" ? "error" : "fallback");
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlaying={() => setVideoState("playing")}
        onError={handleVideoError}
        className={`w-full h-full object-contain ${
          videoState === "fallback" || videoState === "error" ? "hidden" : ""
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
