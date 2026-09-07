import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("release readiness", () => {
  const packageJson = JSON.parse(source("package.json")) as {
    version: string;
    scripts: Record<string, string>;
  };
  const changelog = source("CHANGELOG.md");
  const dockerfile = source("Dockerfile");
  const nginx = source("nginx.conf");
  const updateScript = source("update.sh");
  const releaseWorkflow = source(".github/workflows/release.yml");
  const vite = source("vite.config.ts");

  it("keeps package and changelog versions aligned", () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(changelog).toContain(`## [${packageJson.version}]`);
    expect(packageJson.scripts["release:check"]).toBe(
      "node scripts/check-release.mjs"
    );
  });

  it("publishes release and commit metadata", () => {
    expect(vite).toContain("__HEARTH_RELEASE_VERSION__");
    expect(vite).toContain("__HEARTH_BUILD_SHA__");
    expect(vite).toContain("schemaVersion: 1");
    expect(updateScript).toContain(
      '--build-arg "HEARTH_BUILD_SHA=$FULL_COMMIT"'
    );
  });

  it("provides container health reporting", () => {
    expect(nginx).toContain("location = /healthz");
    expect(nginx).toContain("return 200");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("http://127.0.0.1/healthz");
    expect(updateScript).toContain("/healthz");
  });

  it("supports initial installation and rollback deployments", () => {
    expect(updateScript).toContain("had_live_container=0");
    expect(updateScript).toContain("Starting an initial deployment");
    expect(updateScript).toContain("Deployment failed. Restoring");
  });

  it("validates tagged releases before publication", () => {
    expect(releaseWorkflow).toContain('tags:\n      - "v*"');
    expect(releaseWorkflow).toContain("npm run release:check");
    expect(releaseWorkflow).toContain("npm run test:e2e");
    expect(releaseWorkflow).toContain("gh release create");
  });
});
