import { io } from "socket.io-client";

// Connect to same-origin Socket.IO server. In dev, Vite proxy will forward to backend.
const socket = io("/", {
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

// console.log("Socket connecting to same-origin Socket.IO");

export default socket;