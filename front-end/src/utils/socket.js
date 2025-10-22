import { io } from "socket.io-client";

// In production (separate services), set VITE_SOCKET_URL to your backend origin (e.g., https://your-server.onrender.com)
// Otherwise, default to same-origin "/" which works in dev via Vite proxy or when backend serves the SPA
const SOCKET_URL = import.meta?.env?.VITE_SOCKET_URL || "/";
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