// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://10.14.77.107:5000", {
  transports: ["websocket", "polling"], // optional, to improve fallback
  reconnectionAttempts: 5, // optional
});

export default socket;
