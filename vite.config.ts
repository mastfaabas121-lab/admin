import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, writeFileSync } from "fs";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const injectPwaReleaseVersion = () => ({
  name: "inject-pwa-release-version",
  apply: "build" as const,
  closeBundle() {
    const serviceWorkerPath = path.resolve(__dirname, "dist/sw.js");
    const serviceWorker = readFileSync(serviceWorkerPath, "utf8").replace(
      "__APP_RELEASE_VERSION__",
      packageJson.version,
    );
    writeFileSync(serviceWorkerPath, serviceWorker, "utf8");
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), injectPwaReleaseVersion()],
  base: "/admin/",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
