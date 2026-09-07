import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const buildEnvironment = (
  globalThis as typeof globalThis & {
    process?: { env: Record<string, string | undefined> };
  }
).process?.env ?? {};
const releaseVersion = buildEnvironment.npm_package_version ?? "0.0.0";
const buildCommit = buildEnvironment.HEARTH_BUILD_SHA?.trim() || "development";

function versionPayload(version: string) {
  return {
    schemaVersion: 1,
    release: releaseVersion,
    commit: buildCommit,
    version,
  };
}

function hearthVersionPlugin(): Plugin {
  return {
    name: "hearth-version",
    configureServer(server) {
      server.middlewares.use("/api/version.json", (_request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify(versionPayload("development")));
      });
    },
    generateBundle(_options, bundle) {
      const outputs = Object.values(bundle);
      const entry = outputs.find(
        (output) =>
          output.type === "chunk" &&
          output.isEntry &&
          output.facadeModuleId?.endsWith("/src/main.tsx")
      ) ?? outputs.find(
        (output) => output.type === "chunk" && output.isEntry
      );
      if (!entry) this.error("Hearth entry bundle was not generated");

      this.emitFile({
        type: "asset",
        fileName: "api/version.json",
        source: JSON.stringify(versionPayload(entry.fileName)),
      });
    },
  };
}

export default defineConfig({
  define: {
    __HEARTH_RELEASE_VERSION__: JSON.stringify(releaseVersion),
    __HEARTH_BUILD_SHA__: JSON.stringify(buildCommit),
  },
  plugins: [
    react(),
    hearthVersionPlugin(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        name: "Hearth",
        short_name: "Hearth",
        description: "Home Assistant Dashboard",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "fullscreen",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
