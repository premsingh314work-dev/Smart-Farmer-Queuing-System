import { io } from "socket.io-client";
import { getToken } from "../api/auth";

const SOCKET_URL = "http://localhost:3000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  socket.auth = {
    token: getToken(),
  };

  socket.connect();
};
