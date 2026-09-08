import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for QuestLearn frontend.
// The proxy block forwards any request starting with /api
// to the Express backend on port 3001, so you never have
// to hard-code the backend URL in React code.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
