import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API calls go straight to VITE_API_URL (see .env), so no dev proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
