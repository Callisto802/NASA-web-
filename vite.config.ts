import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { assistantApiPlugin } from "./server/vite-plugin.mjs";

export default defineConfig(({ mode }) => {
  // Load server-only variables for the dev middleware. Only the server reads these;
  // they are never exposed through import.meta.env or the client bundle.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["GEMINI_API_KEY", "GEMINI_MODEL", "PORT"]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), assistantApiPlugin()],
    base: "./",
    server: {
      watch: {
        ignored: ["**/shots/**", "**/dist/**", "**/*.tmpdir/**", "**/.*.tmpdir/**"],
      },
    },
    build: {
      target: "es2020",
      outDir: "dist",
    },
  };
});
