import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nginxConfig = readFileSync(new URL("../nginx.conf", import.meta.url), "utf8");
const recoveryPage = readFileSync(
  new URL("../public/api/pwa-update.html", import.meta.url),
  "utf8"
);
const recoveryScript = readFileSync(
  new URL("../public/api/pwa-update.js", import.meta.url),
  "utf8"
);
const registrationSource = readFileSync(
  new URL("../src/lib/pwa-registration.ts", import.meta.url),
  "utf8"
);
const viteConfig = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8"
);

describe("PWA cache configuration", () => {
  it.each([
    "/index.html",
    "/sw.js",
    "/registerSW.js",
    "/manifest.webmanifest",
    "/api/version.json",
    "/api/pwa-update.html",
    "/api/pwa-update.js",
    "/api/pwa-update.css",
    "/offline.html",
    "/offline.css",
  ])(
    "uses an exact no-store location for %s",
    (path) => {
      const locationStart = nginxConfig.indexOf(`location = ${path}`);
      expect(locationStart).toBeGreaterThan(-1);

      const locationEnd = nginxConfig.indexOf("}", locationStart);
      const location = nginxConfig.slice(locationStart, locationEnd);
      expect(location).toContain("no-store");
    }
  );

  it("refreshes PWA caches without removing saved settings", () => {
    expect(recoveryPage).toContain('src="/api/pwa-update.js"');
    expect(recoveryScript).toContain("getRegistrations");
    expect(recoveryScript).toContain("registration.unregister()");
    expect(recoveryScript).toContain("caches.delete(cacheName)");
    expect(recoveryScript).not.toContain("localStorage.clear");
    expect(recoveryScript).not.toContain("localStorage.removeItem");
  });

  it("does not let a new worker reload or claim an open dashboard", () => {
    expect(registrationSource).not.toContain("controllerchange");
    expect(registrationSource).not.toContain("window.location.reload");
    expect(viteConfig).toContain('registerType: "prompt"');
    expect(viteConfig).toContain("skipWaiting: false");
    expect(viteConfig).toContain("clientsClaim: false");
  });

  it("stops repeated automatic recovery while keeping manual updates available", () => {
    expect(recoveryScript).toContain('search.has("runtime-recovery")');
    expect(recoveryScript).toContain('"hearth-recovery-page-at"');
    expect(recoveryScript).toContain("window.localStorage.getItem");
    expect(recoveryScript).toContain("window.localStorage.setItem");
    expect(recoveryScript).toContain("stopRecoveryLoop");
  });
});
