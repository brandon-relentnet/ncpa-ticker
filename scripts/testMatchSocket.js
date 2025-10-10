#!/usr/bin/env node
import process from "node:process";
import readline from "node:readline";
import { io } from "socket.io-client";

const DEFAULT_SOCKET_URL = "https://tournaments.ncpaofficial.com";

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const value = args[index + 1];
  if (value && !value.startsWith("--")) {
    options[key] = value;
    index += 1;
  } else {
    options[key] = "true";
  }
}

const matchId = options.match;
const apiKey = options.key;
const rawUrl = options.url ?? DEFAULT_SOCKET_URL;
const socketUrl = rawUrl.replace(/\/+$/, "");
const { log, error: logError } = console;

if (!matchId || !apiKey) {
  logError("Usage: node scripts/testMatchSocket.js --match <id> --key <api-key> [--url <socket-url>]");
  process.exit(1);
}

const socket = io(socketUrl, {
  forceNew: true,
  transports: ["polling", "websocket"],
  timeout: 10000,
  reconnectionAttempts: 2,
  auth: { key: apiKey, matchId },
  query: { key: apiKey, matchId },
});

const room = matchId.startsWith("match-") ? matchId : `match-${matchId}`;
const joinPayload = { room, matchId, key: apiKey };

const print = (label, payload) => {
  const timestamp = new Date().toISOString();
  log(`[${timestamp}] ${label}`, payload ?? "");
};

socket.on("connect", () => {
  print("connected", { socketId: socket.id, room });
  socket.emit("join", joinPayload, (ack) => {
    if (ack?.error) {
      print("join failed", ack.error);
      socket.disconnect();
      process.exitCode = 1;
      return;
    }
    print("join acknowledged", ack);
  });
});

socket.on("disconnect", (reason) => {
  print("disconnected", { reason });
});

socket.on("connect_error", (error) => {
  print("connect_error", { message: error.message });
});

socket.on("error", (error) => {
  print("error", error);
});

socket.on("updateGames", (payload) => {
  print("updateGames", payload);
});

socket.on("joined", (payload) => {
  print("joined event", payload);
});

const cleanup = () => {
  if (socket.connected || socket.connecting) {
    socket.disconnect();
  }
  process.exit(0);
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

print("info", "Press Enter to exit\n");
rl.on("line", cleanup);
process.on("SIGINT", cleanup);
