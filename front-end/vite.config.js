import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  // Serve app at root during dev and build
  base: "/",
  plugins: [react(), svgr()],
  server: {
    port: 5174,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://10.14.77.107:5000",
      // Proxy Socket.IO websocket requests
      "/socket.io": {
        target: "http://10.14.77.107:5000",
        ws: true,
      },
    },
  },
});
