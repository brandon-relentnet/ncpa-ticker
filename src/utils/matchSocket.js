import { io } from "socket.io-client";

const DEFAULT_SOCKET_URL = "https://tournaments.ncpaofficial.com";
const DEBUG_LIVE =
  import.meta.env.VITE_DEBUG_MATCH_SOCKET === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MATCH_SOCKET !== "false");

const buildSocketUrl = () => {
  const raw = import.meta.env.VITE_NCPA_SOCKET_URL ?? DEFAULT_SOCKET_URL;
  return typeof raw === "string" ? raw.replace(/\/+$/, "") : DEFAULT_SOCKET_URL;
};

const getSocketApiKey = () => {
  const key = import.meta.env.VITE_NCPA_API_KEY;
  if (!key) {
    throw new Error("Missing VITE_NCPA_API_KEY environment variable");
  }
  return key;
};

const logDebug = (...args) => {
  if (!DEBUG_LIVE) return;
  console.debug("[matchSocket]", ...args);
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
  const numericMatchId = Number.parseInt(
    typeof matchId === "string" ? matchId.trim() : matchId,
    10
  );
  const bracketMatchId = Number.isFinite(numericMatchId)
    ? numericMatchId
    : matchId;
  const apiKey = getSocketApiKey();

  const socket = io(socketUrl, {
    forceNew: true,
    path: "/socket.io",
    transports: ["polling", "websocket"],
    timeout: 10000,
    reconnectionAttempts: Infinity,
    query: { key: apiKey },
    ...(typeof window === "undefined"
      ? { extraHeaders: { Origin: socketUrl } }
      : {}),
  });

  const handleConnect = () => {
    logDebug("connected", { socketId: socket.id, bracketMatchId });
    socket.emit("subscribeToGameUpdates", bracketMatchId, (ack) => {
      if (ack && ack.error) {
        const joinError = new Error(
          typeof ack.error === "string"
            ? ack.error
            : "Failed to subscribe to game updates"
        );
        logDebug("subscribe failed", ack.error);
        if (typeof onError === "function") onError(joinError);
        return;
      }
      logDebug("subscribed", ack ?? {});
      if (typeof onConnect === "function") {
        onConnect({ bracketMatchId, ack });
      }
    });
  };

  const handleDisconnect = (reason) => {
    logDebug("disconnected", { bracketMatchId, reason });
    if (typeof onDisconnect === "function") {
      onDisconnect({ bracketMatchId, reason });
    }
  };

  const handleError = (error) => {
    logDebug("error", error);
    if (typeof onError === "function") {
      onError(error);
    }
  };

  const handleGamesUpdate = (payload) => {
    logDebug("updateGames", payload);
    if (typeof onGamesUpdate === "function") {
      onGamesUpdate(payload);
    }
  };

  const handleAny = (eventName, ...args) => {
    if (eventName === "updateGames") return;
    logDebug("event", eventName, ...args);
  };

  const handleJoined = (payload) => logDebug("joined event", payload);

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleError);
  socket.on("error", handleError);
  socket.on("updateGames", handleGamesUpdate);
  socket.on("joined", handleJoined);
  socket.onAny(handleAny);

  const dispose = () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("connect_error", handleError);
    socket.off("error", handleError);
    socket.off("updateGames", handleGamesUpdate);
    socket.off("joined", handleJoined);
    socket.offAny(handleAny);

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
