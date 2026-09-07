/* global document, window, navigator, caches, console */

const status = document.getElementById("status");
let leaving = false;

function returnToHearth() {
  if (leaving) return;
  leaving = true;
  window.location.replace("/?pwa-updated=" + Date.now());
}

async function updateHearth() {
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
