import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Laravel API runs on 127.0.0.1:8000 during development. All /api/* calls
// (including /api/media/* image serving) are proxied to it, so the app works
// without CORS or a hardcoded base URL. In production, set VITE_API_BASE_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      }
    }
  }
});