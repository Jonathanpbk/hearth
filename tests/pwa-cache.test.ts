import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nginxConfig = readFileSync(new URL("../nginx.conf", import.meta.url), "utf8");

describe("PWA cache configuration", () => {
  it.each(["/index.html", "/sw.js", "/registerSW.js", "/manifest.webmanifest"])(
    "uses an exact no-store location for %s",
    (path) => {
      const locationStart = nginxConfig.indexOf(`location = ${path}`);
      expect(locationStart).toBeGreaterThan(-1);

      const locationEnd = nginxConfig.indexOf("}", locationStart);
      const location = nginxConfig.slice(locationStart, locationEnd);
      expect(location).toContain("no-store");
    }
  );
});
