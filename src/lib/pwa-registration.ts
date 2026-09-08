const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

async function requestUpdate(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    await registration.update();
  } catch (error) {
    console.error("Failed to check for a Hearth update", error);
  }
}

export function registerPWAUpdates(): void {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        void requestUpdate(registration);
        window.setInterval(() => void requestUpdate(registration), UPDATE_INTERVAL_MS);
      })
      .catch((error) => {
        console.error("Failed to register the Hearth service worker", error);
      });
  });
}
