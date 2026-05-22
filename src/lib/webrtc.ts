// go2rtc WebRTC signaling uses its WebSocket API, not HTTP POST.
// Protocol: connect → send offer → receive answer → exchange ICE candidates.

export interface WebRTCSession {
  pc: RTCPeerConnection;
  stop(): void;
}

export async function startWebRTCStream(
  go2rtcUrl: string,
  streamName: string,
  videoElement: HTMLVideoElement
): Promise<WebRTCSession> {
  const wsUrl =
    go2rtcUrl.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws")).replace(/\/$/, "") +
    `/api/ws?src=${encodeURIComponent(streamName)}`;

  const ws = new WebSocket(wsUrl);

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  pc.ontrack = (event) => {
    if (event.streams[0]) videoElement.srcObject = event.streams[0];
  };

  // Forward local ICE candidates to go2rtc as they are gathered (trickle ICE)
  pc.addEventListener("icecandidate", (event) => {
    if (ws.readyState === WebSocket.OPEN && event.candidate) {
      ws.send(JSON.stringify({ type: "webrtc/candidate", value: event.candidate.candidate }));
    }
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        pc.close();
        reject(new Error("WebRTC: timed out"));
      }
    }, 10000);

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    }

    ws.addEventListener("open", async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "webrtc/offer", value: offer.sdp }));
      } catch (err) {
        settle(() => { ws.close(); pc.close(); reject(err); });
      }
    });

    ws.addEventListener("message", async (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: { type: string; value: string };
      try { msg = JSON.parse(ev.data) as typeof msg; } catch { return; }

      if (msg.type === "webrtc/answer") {
        try {
          await pc.setRemoteDescription({ type: "answer", sdp: msg.value });
          settle(() => resolve({
            pc,
            stop() { pc.ontrack = null; pc.close(); ws.close(); },
          }));
        } catch (err) {
          console.error("[WebRTC] setRemoteDescription failed:", err);
          settle(() => { ws.close(); pc.close(); reject(err); });
        }
      } else if (msg.type === "webrtc/candidate" && msg.value) {
        pc.addIceCandidate({ candidate: msg.value, sdpMid: "0" })
          .catch((err) => console.warn("[WebRTC] addIceCandidate failed:", err));
      }
    });

    ws.addEventListener("error", () =>
      settle(() => { pc.close(); reject(new Error("WebRTC: WebSocket error")); })
    );
  });
}
