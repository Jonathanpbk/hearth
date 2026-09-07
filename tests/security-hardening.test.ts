import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("browser security hardening", () => {
  const index = source("index.html");
  const nginx = source("nginx.conf");
  const headers = source("nginx-security-headers.conf");
  const dockerfile = source("Dockerfile");

  it("does not contact an external font provider", () => {
    expect(index).not.toContain("fonts.googleapis.com");
    expect(index).not.toContain("fonts.gstatic.com");
  });

  it("ships security headers with every response class", () => {
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain("connect-src 'self' http: https: ws: wss:");
    expect(headers).toContain("media-src 'self' blob: http: https:");
    expect(headers).toContain("X-Content-Type-Options \"nosniff\"");
    expect(headers).toContain("X-Frame-Options \"DENY\"");
    expect(headers).toContain("Referrer-Policy \"no-referrer\"");
    expect(headers).toContain("screen-wake-lock=(self)");

    expect(
      nginx.match(/include \/etc\/nginx\/security-headers\.conf;/g)
    ).toHaveLength(12);
    expect(dockerfile).toContain(
      "COPY nginx-security-headers.conf /etc/nginx/security-headers.conf"
    );
  });
});
