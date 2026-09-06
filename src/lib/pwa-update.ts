export interface PwaVersionInfo {
  version: string;
}

const ENTRY_BUNDLE_PATTERN = /(?:^|\/)(assets\/index-[A-Za-z0-9_-]+\.js)(?:[?#]|$)/;

export function findEntryBundle(urls: Iterable<string>): string | null {
  for (const url of urls) {
    const match = url.match(ENTRY_BUNDLE_PATTERN);
    if (match) return match[1];
  }
  return null;
}

export function getInstalledPwaVersion(): string | null {
  const entryBundle = findEntryBundle(
    Array.from(document.scripts, (script) => script.src)
  );
  if (entryBundle) return entryBundle;
  return import.meta.env.DEV ? "development" : null;
}

export async function fetchLatestPwaVersion(): Promise<PwaVersionInfo> {
  const response = await fetch(`/api/version.json?check=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Version check failed with status ${response.status}`);
  }

  const result = await response.json() as Partial<PwaVersionInfo>;
  if (typeof result.version !== "string" || !result.version) {
    throw new Error("Version response is invalid");
  }
  return { version: result.version };
}

export async function replacePwaCaches(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  window.location.replace(`/?pwa-updated=${Date.now()}`);
}
