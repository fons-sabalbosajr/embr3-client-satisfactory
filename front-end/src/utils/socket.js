import { io } from "socket.io-client";

// In production (separate services), set VITE_SOCKET_URL to your backend origin (e.g., https://your-server.onrender.com)
// Otherwise, if VITE_API_BASE is set, derive the origin from it; finally, default to same-origin "/".
let SOCKET_URL = "/";
const ENV = typeof import.meta !== "undefined" ? import.meta.env : undefined;
if (ENV?.VITE_SOCKET_URL) {
  SOCKET_URL = ENV.VITE_SOCKET_URL;
} else if (ENV?.VITE_API_BASE) {
  try {
    const u = new URL(ENV.VITE_API_BASE, window.location.origin);
    SOCKET_URL = u.origin;
  } catch (_) {
    // ignore and keep default
  }
}

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

// console.log("Socket connecting to same-origin Socket.IO");

export default socket;