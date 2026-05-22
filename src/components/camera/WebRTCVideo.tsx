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

type VideoState = "connecting" | "playing" | "fallback";

export function WebRTCVideo({ go2rtcUrl, streamName, mode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcRef = useRef<WebRTCSession | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [videoState, setVideoState] = useState<VideoState>("connecting");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !go2rtcUrl || !streamName) return;

    let cancelled = false;
    setVideoState("connecting");

    async function start() {
      try {
        if (mode === "webrtc") {
          const session = await startWebRTCStream(go2rtcUrl, streamName, video!);
          if (cancelled) { session.stop(); return; }
          rtcRef.current = session;

          // Fall back to MJPEG if not connected within 3 s
          const failTimer = setTimeout(() => {
            if (session.pc.connectionState !== "connected" && !cancelled) {
              setVideoState("fallback");
            }
          }, 3000);

          session.pc.addEventListener("connectionstatechange", () => {
            if (cancelled) return;
            if (session.pc.connectionState === "connected") {
              clearTimeout(failTimer);
              setVideoState("playing");
            } else if (session.pc.connectionState === "failed") {
              clearTimeout(failTimer);
              setVideoState("fallback");
            }
          });
        } else {
          const ws = await startMSEStream(go2rtcUrl, streamName, video!);
          if (cancelled) { stopMSEStream(ws, video!); return; }
          wsRef.current = ws;
          setVideoState("playing");
        }
      } catch {
        if (!cancelled) setVideoState("fallback");
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rtcRef.current) { rtcRef.current.stop(); rtcRef.current = null; }
      if (wsRef.current) { stopMSEStream(wsRef.current, video); wsRef.current = null; }
    };
  }, [go2rtcUrl, streamName, mode]);

  const mjpegSrc = `${go2rtcUrl}/api/stream.mjpeg?src=${encodeURIComponent(streamName)}`;

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-contain ${videoState === "fallback" ? "hidden" : ""}`}
      />
      {videoState === "fallback" && (
        <img
          src={mjpegSrc}
          alt={streamName}
          className="w-full h-full object-contain"
        />
      )}
    </>
  );
}
