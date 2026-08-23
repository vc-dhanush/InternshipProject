import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile() {
  const file = path.join(rootDir, ".env");
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return values;
}

const fileEnv = readEnvFile();
const apiPort = Number(process.env.PORT || fileEnv.PORT || 5000);
const rawHost = process.env.HOST || fileEnv.HOST || "127.0.0.1";
const apiHost = rawHost === "0.0.0.0" || rawHost === "::" ? "127.0.0.1" : rawHost;
const apiTarget = `http://${apiHost}:${apiPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
      },
      "/uploads": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
