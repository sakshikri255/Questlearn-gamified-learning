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
    open: true, // auto-open browser tab when dev server starts
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise warning threshold — framer-motion is large but tree-shaken
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor libs into a separate cached chunk.
        // Users only re-download app code when you change app code,
        // and only re-download vendor code when deps change.
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
