import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  base: "/ocsm/", // 👈 important for Nginx subpath
  plugins: [react(), svgr()],
  server: {
    port: 5174,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:5001",
      
      // Proxy Socket.IO websocket requests
      "/socket.io": {
        target: "http://localhost:5001",
        ws: true,
      },
    },
  },
});
