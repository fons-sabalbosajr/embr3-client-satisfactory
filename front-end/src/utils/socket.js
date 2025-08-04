import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

//console.log("Socket connecting to:", import.meta.env.VITE_SOCKET_URL);

export default socket;