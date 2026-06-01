import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server, Socket } from "socket.io";
import {
  addPlayer,
  canStartFromLobby,
  createGame,
  drawCardAndPass,
  endTurn,
  finishRoundIfDrawPileEmpty,
  generateRoomCode,
  getPublicGameStateForPlayer,
  markDisconnected,
  Meld,
  proposeTable,
  setPlayerReady,
  startRound
} from "../../shared/src";

const PORT = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: isProduction
    ? undefined
    : {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        credentials: true
      }
});

const rooms = new Map<string, ReturnType<typeof createGame>>();
const socketPlayers = new Map<string, { roomCode: string; playerId: string }>();

interface Ack<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

function ackOk<T>(data: T): Ack<T> {
  return { ok: true, data };
}

function ackFail(error: string): Ack {
  return { ok: false, error };
}

function getRoom(roomCode: string) {
  return rooms.get(roomCode.trim().toUpperCase());
}

async function broadcastRoom(roomCode: string): Promise<void> {
  const room = getRoom(roomCode);
  if (!room) return;

  const socketIds = await io.in(room.roomCode).allSockets();
  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);
    const playerId = socket?.data.playerId as string | undefined;
    if (playerId) {
      socket?.emit("state:update", getPublicGameStateForPlayer(room, playerId));
    }
  }
}

function attachPlayer(socket: Socket, roomCode: string, playerId: string): void {
  socket.data.roomCode = roomCode;
  socket.data.playerId = playerId;
  socketPlayers.set(socket.id, { roomCode, playerId });
  socket.join(roomCode);
}

app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

if (isProduction) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

io.on("connection", (socket) => {
  socket.on("room:create", async (payload: { name: string; maxPlayers: number }, callback?: (ack: Ack) => void) => {
    try {
      const roomCode = generateRoomCode(rooms.keys());
      const game = createGame(roomCode, payload.name, payload.maxPlayers);
      rooms.set(roomCode, game);
      const playerId = game.hostId;
      attachPlayer(socket, roomCode, playerId);
      callback?.(ackOk({ roomCode, playerId, state: getPublicGameStateForPlayer(game, playerId) }));
      await broadcastRoom(roomCode);
    } catch (error) {
      callback?.(ackFail(error instanceof Error ? error.message : "Creation impossible."));
    }
  });

  socket.on("room:join", async (payload: { roomCode: string; name: string }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    if (!game) {
      callback?.(ackFail("Salon introuvable."));
      return;
    }

    const result = addPlayer(game, payload.name);
    if (!result.ok) {
      callback?.(ackFail(result.error));
      return;
    }

    attachPlayer(socket, game.roomCode, result.value.id);
    callback?.(ackOk({ roomCode: game.roomCode, playerId: result.value.id, state: getPublicGameStateForPlayer(game, result.value.id) }));
    await broadcastRoom(game.roomCode);
  });

  socket.on("room:ready", async (payload: { roomCode: string; ready: boolean }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }

    const result = setPlayerReady(game, playerId, Boolean(payload.ready));
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("game:start", async (payload: { roomCode: string }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    if (playerId !== game.hostId) {
      callback?.(ackFail("Seul l'hote peut lancer la partie."));
      return;
    }
    if (!canStartFromLobby(game)) {
      callback?.(ackFail("Le salon doit etre complet et tous les joueurs doivent etre prets."));
      return;
    }

    const result = startRound(game);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("game:newRound", async (payload: { roomCode: string }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    if (playerId !== game.hostId) {
      callback?.(ackFail("Seul l'hote peut relancer une manche."));
      return;
    }
    if (game.status !== "round_finished") {
      callback?.(ackFail("La manche precedente n'est pas terminee."));
      return;
    }

    const result = startRound(game);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("game:draw", async (payload: { roomCode: string }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }

    const result = drawCardAndPass(game, playerId);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("game:proposeTable", async (payload: { roomCode: string; table: Meld[] }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }

    const result = proposeTable(game, playerId, payload.table);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("game:endTurn", async (payload: { roomCode: string }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }

    const result = endTurn(game, playerId);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("game:endEmptyDraw", async (payload: { roomCode: string }, callback?: (ack: Ack) => void) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId as string | undefined;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }

    const result = finishRoundIfDrawPileEmpty(game, playerId);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });

  socket.on("disconnect", async () => {
    const session = socketPlayers.get(socket.id);
    socketPlayers.delete(socket.id);
    if (!session) return;

    const game = getRoom(session.roomCode);
    if (!game) return;
    markDisconnected(game, session.playerId);
    await broadcastRoom(session.roomCode);
  });
});

server.listen(PORT, () => {
  console.log(`Rami voleur server listening on port ${PORT}`);
});
