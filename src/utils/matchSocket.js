import { io } from "socket.io-client";

const DEFAULT_SOCKET_URL = "https://tournaments.ncpaofficial.com";

const buildSocketUrl = () => {
  const raw = import.meta.env.VITE_NCPA_SOCKET_URL ?? DEFAULT_SOCKET_URL;
  return typeof raw === "string" ? raw.replace(/\/+$/, "") : DEFAULT_SOCKET_URL;
};

const buildRoomName = (matchId) => {
  if (!matchId) throw new Error("matchId is required to join a socket room");
  return matchId.startsWith("match-") ? matchId : `match-${matchId}`;
};

const getSocketApiKey = () => {
  const key = import.meta.env.VITE_NCPA_API_KEY;
  if (!key) {
    throw new Error("Missing VITE_NCPA_API_KEY environment variable");
  }
  return key;
};

export function createMatchSocket({
  matchId,
  onGamesUpdate,
  onConnect,
  onDisconnect,
  onError,
} = {}) {
  if (!matchId) throw new Error("matchId is required for live match updates");

  const socketUrl = buildSocketUrl();
  const room = buildRoomName(matchId);
  const apiKey = getSocketApiKey();

  const socket = io(socketUrl, {
    forceNew: true,
    transports: ["polling", "websocket"],
    timeout: 10000,
    reconnectionAttempts: Infinity,
    auth: { key: apiKey },
    query: { key: apiKey },
  });

  const handleConnect = () => {
    socket.emit("join", room);
    if (typeof onConnect === "function") {
      onConnect({ room });
    }
  };

  const handleDisconnect = (reason) => {
    if (typeof onDisconnect === "function") {
      onDisconnect({ room, reason });
    }
  };

  const handleError = (error) => {
    if (typeof onError === "function") {
      onError(error);
    }
  };

  const handleGamesUpdate = (payload) => {
    if (typeof onGamesUpdate === "function") {
      onGamesUpdate(payload);
    }
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleError);
  socket.on("error", handleError);
  socket.on("updateGames", handleGamesUpdate);

  const dispose = () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("connect_error", handleError);
    socket.off("error", handleError);
    socket.off("updateGames", handleGamesUpdate);

    if (socket.connected || socket.connecting) {
      socket.disconnect();
    }
  };

  return {
    socket,
    room,
    dispose,
  };
}

export default createMatchSocket;
