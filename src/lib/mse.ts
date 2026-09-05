// go2rtc MSE streaming via WebSocket API.
// Protocol: connect → send {"type":"mse","value":"<codec list>"}
//           → receive {"type":"mse","value":"video/mp4; codecs=\"...\""}
//           → pipe binary fMP4 segments into MediaSource.

const MSE_CODECS =
  "avc1.640029,avc1.64002A,avc1.640033,hvc1.1.6.L153.B0,mp4a.40.2,mp4a.40.5,flac,opus";

export async function startMSEStream(
  go2rtcUrl: string,
  streamName: string,
  videoElement: HTMLVideoElement
): Promise<WebSocket> {
  const wsUrl =
    go2rtcUrl.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws")).replace(/\/$/, "") +
    `/api/ws?src=${encodeURIComponent(streamName)}`;

  const ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        reject(new Error("MSE: timed out"));
      }
    }, 5000);

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    }

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "mse", value: MSE_CODECS }));
    });

    ws.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: { type: string; value: string };
      try { msg = JSON.parse(ev.data) as typeof msg; } catch { return; }
      if (msg.type !== "mse") return;

      settle(() => {
        initSourceBuffer(videoElement, ws, msg.value);
        resolve(ws);
      });
    });

    ws.addEventListener("error", () =>
      settle(() => {
        ws.close();
        reject(new Error("MSE: WebSocket error"));
      })
    );
  });
}

function initSourceBuffer(
  video: HTMLVideoElement,
  ws: WebSocket,
  mimeType: string
): void {
  const ms = new MediaSource();

  // Keep an explicit JS reference — some browsers GC the MediaSource if the
  // only reference is through the blob URL, causing immediate sourceclose.
  (video as HTMLVideoElement & { _mse?: MediaSource })._mse = ms;

  video.src = URL.createObjectURL(ms);

  // Buffer binary messages before sourceopen fires. The fMP4 init segment
  // (ftyp + moov) arrives immediately after the codec handshake and must not
  // be dropped — without it the SourceBuffer cannot decode subsequent segments.
  const pending: ArrayBuffer[] = [];
  function bufferEarly(ev: MessageEvent) {
    if (typeof ev.data !== "string") pending.push(ev.data as ArrayBuffer);
  }
  ws.addEventListener("message", bufferEarly);

  ms.addEventListener("sourceopen", () => {
    ws.removeEventListener("message", bufferEarly);

    let sb: SourceBuffer;
    try {
      sb = ms.addSourceBuffer(mimeType);
    } catch (err) {
      console.error("[MSE] addSourceBuffer failed:", err);
      return;
    }
    sb.mode = "segments";

    const queue: ArrayBuffer[] = [...pending];
    let busy = false;

    function pump() {
      if (busy || queue.length === 0 || sb.updating || ms.readyState !== "open") return;
      busy = true;
      try {
        sb.appendBuffer(queue.shift()!);
      } catch (err) {
        console.error("[MSE] appendBuffer failed:", err);
        busy = false;
      }
    }

    sb.addEventListener("updateend", () => { busy = false; pump(); });
    sb.addEventListener("error", (ev) => console.error("[MSE] SourceBuffer error:", ev));

    ws.addEventListener("message", (ev) => {
      if (typeof ev.data === "string") return;
      queue.push(ev.data as ArrayBuffer);
      pump();
    });

    pump();
  });
}

export function stopMSEStream(ws: WebSocket, videoElement: HTMLVideoElement): void {
  ws.close();
  const src = videoElement.src;
  videoElement.src = "";
  delete (videoElement as HTMLVideoElement & { _mse?: MediaSource })._mse;
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
}
