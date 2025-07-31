// src/socket.js
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  
});

console.log("Socket connecting to:", import.meta.env.VITE_SOCKET_URL);

export default socket;
