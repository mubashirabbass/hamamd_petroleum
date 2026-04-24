import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  root: "./ebs-mobile", // This tells Vite to load the Mobile App code
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1422,
        }
      : undefined,
  },
}));
