/* global document, window, navigator, caches, console, URLSearchParams */

const status = document.getElementById("status");
const returnLink = document.getElementById("return-link");
const RECOVERY_PAGE_STORAGE_KEY = "hearth-recovery-page-at";
const RECOVERY_PAGE_COOLDOWN_MS = 5 * 60 * 1000;
let leaving = false;

function isAutomaticRuntimeRecovery() {
  const search = new URLSearchParams(window.location.search);
  return search.has("runtime-recovery");
}

function claimRecoveryPage() {
  if (!isAutomaticRuntimeRecovery()) return true;

  try {
    const now = Date.now();
    const lastAttempt = Number(
      window.localStorage.getItem(RECOVERY_PAGE_STORAGE_KEY)
    );
    if (
      Number.isFinite(lastAttempt) &&
      lastAttempt > 0 &&
      now - lastAttempt < RECOVERY_PAGE_COOLDOWN_MS
    ) {
      return false;
    }

    window.localStorage.setItem(RECOVERY_PAGE_STORAGE_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

function stopRecoveryLoop() {
  status.textContent =
    "Automatic recovery stopped to prevent a reload loop. Return to Hearth and use Update Hearth if the dashboard still fails to load.";
  returnLink.hidden = false;
}

function returnToHearth() {
  if (leaving) return;
  leaving = true;
  window.location.replace("/?pwa-updated=" + Date.now());
}

async function updateHearth() {
  if (!claimRecoveryPage()) {
    stopRecoveryLoop();
    return;
  }

  try {
    status.textContent = "Replacing the cached dashboard files.";

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    returnToHearth();
  } catch (error) {
    status.textContent = "The update failed. Reopen this page while connected.";
    console.error("Failed to refresh Hearth", error);
  }
}

void updateHearth();
