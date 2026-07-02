import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// One id per production build; the kiosk polls /version.json on every entry
// into the Attract screen and reloads itself when the id changes (PLANNING §9.4).
const buildId = Date.now().toString(36);

function emitVersionJson(): Plugin {
  return {
    name: "kiosk-version-json",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ build: buildId }),
      });
    },
  };
}

export default defineConfig({
  // Relative base so the same build works at a domain root (Cloudflare Pages)
  // or under a subpath (github.io/frontofficekiosk/).
  base: "./",
  plugins: [react(), tailwindcss(), emitVersionJson()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
