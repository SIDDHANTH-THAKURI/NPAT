'use strict';

require('dotenv').config({ path: '../../.env' });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const {
  createRoom,
  joinRoom,
  startGame,
  submitAnswers,
  nextRound,
  disconnectPlayer,
  getRoom,
  publicPlayer,
  AUTO_START_DELAY_MS,
} = require('./roomManager');

// Prisma
let prisma;
try {
  const { PrismaClient } = require('./generated/prisma');
  prisma = new PrismaClient();
} catch (e) {
  console.warn('[DB] Prisma client not generated yet — running without DB persistence');
  // Stub prisma so the rest of the code won't blow up
  const noop = async () => null;
  prisma = new Proxy({}, { get: () => new Proxy({}, { get: () => noop }) });
}

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: [CLIENT_ORIGIN, 'http://localhost:5173'] }));
app.use(express.json());

// Serve React build in production
const CLIENT_BUILD = path.join(__dirname, '../../src/client/dist');
app.use(express.static(CLIENT_BUILD));
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_BUILD, 'index.html'), (err) => {
    if (err) res.status(404).send('Client not built yet');
  });
});

/** Emit an event to all sockets in a room by room code. */
function emitToRoom(code, event, data) {
  io.to(code).emit(event, data);
}

// ─── Socket.io event handlers ───────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);

  /**
   * @event create_room
   * @param {{ nickname: string, maxPlayers: number }} data
   * @emits room_updated — sent to creator with room state
   */
  socket.on('create_room', async ({ nickname, maxPlayers } = {}) => {
    if (!nickname || typeof nickname !== 'string') return;
    const max = Math.min(6, Math.max(2, Number(maxPlayers) || 4));

    const room = await createRoom(socket.id, nickname.trim().slice(0, 20), max, prisma);
    const player = room.players[0];

    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;

    socket.emit('room_updated', {
      code: room.code,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: room.players.map((p) => ({ ...publicPlayer(p), isHost: p.id === room.hostId })),
      playerId: player.id,
    });
  });

  /**
   * @event join_room
   * @param {{ code: string, nickname: string, playerId?: string }} data
   * @emits room_updated — broadcast to all players in room
   * @emits join_error  — sent to requester on failure
   */
  socket.on('join_room', async ({ code, nickname, playerId: existingId } = {}) => {
    if (!code || !nickname) return;
    const upperCode = code.trim().toUpperCase();

    const result = await joinRoom(
      upperCode,
      socket.id,
      nickname.trim().slice(0, 20),
      existingId || null,
      prisma
    );

    if (result.error) {
      socket.emit('join_error', { message: result.error });
      return;
    }

    const { room, player } = result;
    socket.join(upperCode);
    socket.data.playerId = player.id;
    socket.data.roomCode = upperCode;

    io.to(upperCode).emit('room_updated', {
      code: upperCode,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: room.players.map((p) => ({ ...publicPlayer(p), isHost: p.id === room.hostId })),
      playerId: player.id, // only meaningful for the joiner — others ignore it
    });

    // Auto-start if room is full
    if (room.players.length >= room.maxPlayers && room.status === 'WAITING') {
      emitToRoom(upperCode, 'auto_start_countdown', { delayMs: AUTO_START_DELAY_MS });
      room.autoStartTimer = setTimeout(
        () => startGame(upperCode, emitToRoom, prisma),
        AUTO_START_DELAY_MS
      );
    }
  });

  /**
   * @event start_game
   * @param {{ code: string }} data
   * Only the host may trigger this.
   */
  socket.on('start_game', async ({ code } = {}) => {
    const upperCode = (code || '').toUpperCase();
    const room = getRoom(upperCode);
    if (!room) return;
    if (room.hostId !== socket.data.playerId) return; // not the host
    if (room.players.length < 2) {
      socket.emit('start_error', { message: 'Need at least 2 players' });
      return;
    }
    await startGame(upperCode, emitToRoom, prisma);
  });

  /**
   * @event submit_answers
   * @param {{ code: string, answers: { name:string, place:string, animal:string, thing:string } }} data
   */
  socket.on('submit_answers', async ({ code, answers } = {}) => {
    const upperCode = (code || '').toUpperCase();
    const playerId = socket.data.playerId;
    if (!playerId || !answers) return;
    await submitAnswers(upperCode, playerId, answers, emitToRoom, prisma);
  });

  /**
   * @event next_round
   * @param {{ code: string }} data
   * Advances to the next round. Server guards against duplicate calls.
   */
  socket.on('next_round', async ({ code } = {}) => {
    const upperCode = (code || '').toUpperCase();
    const room = getRoom(upperCode);
    if (!room) return;
    if (room.hostId !== socket.data.playerId) return;
    await nextRound(upperCode, emitToRoom, prisma);
  });

  /**
   * @event send_reaction
   * @param {{ code: string, emoji: string }} data
   * Broadcasts an emoji reaction to all players in the lobby.
   */
  socket.on('send_reaction', ({ code, emoji } = {}) => {
    const upperCode = (code || '').toUpperCase();
    const ALLOWED = ['👋', '😂', '🔥', '😤', '🎉'];
    if (!ALLOWED.includes(emoji)) return;
    const room = getRoom(upperCode);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    io.to(upperCode).emit('reaction', { playerId: player.id, nickname: player.nickname, emoji });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] disconnected: ${socket.id}`);
    disconnectPlayer(socket.id, emitToRoom);
  });
});

// ─── Start server ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 NPAT server listening on http://localhost:${PORT}`);
});
