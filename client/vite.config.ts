import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const clientRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(clientRoot, "..");

export default defineConfig({
  root: clientRoot,
  publicDir: path.join(clientRoot, "public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.join(projectRoot, "shared", "src")
    }
  },
  server: {
    fs: {
      allow: [projectRoot]
    },
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true
      }
    }
  },
  build: {
    outDir: path.join(projectRoot, "dist", "client"),
    emptyOutDir: true
  }
});
