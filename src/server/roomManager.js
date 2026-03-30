'use strict';

const { v4: uuidv4 } = require('uuid');
const { pickLetter, calculateRoundScores, buildAnswerTable, TOTAL_ROUNDS } = require('./gameLogic');

/** In-memory room store (supplemented by Postgres for persistence) */
const rooms = new Map();

const ROUND_DURATION_MS = 60_000;
const COUNTDOWN_MS = 5_000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1_000; // 2 hours
const AUTO_START_DELAY_MS = 5_000;

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐸', '🐙'];

/**
 * Generate a 4-character uppercase alphanumeric room code.
 * @returns {string}
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Create a new room.
 * @param {string} hostSocketId
 * @param {string} hostNickname
 * @param {number} maxPlayers
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {object} room state
 */
async function createRoom(hostSocketId, hostNickname, maxPlayers, prisma) {
  let code;
  do {
    code = generateCode();
  } while (rooms.has(code));

  const hostId = uuidv4();
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

  const host = {
    id: hostId,
    nickname: hostNickname,
    avatar,
    socketId: hostSocketId,
    score: 0,
    connected: true,
  };

  const room = {
    code,
    hostId,
    maxPlayers,
    status: 'WAITING',
    currentRound: 0,
    usedLetters: [],
    players: [host],
    rounds: [],
    createdAt: Date.now(),
    expiresAt: Date.now() + ROOM_TTL_MS,
    autoStartTimer: null,
    roundTimer: null,
    currentLetter: null,
    roundStartTs: null,
  };

  rooms.set(code, room);

  // Persist to DB
  try {
    await prisma.room.create({
      data: {
        id: uuidv4(),
        code,
        hostId,
        maxPlayers,
        status: 'WAITING',
        expiresAt: new Date(room.expiresAt),
        players: {
          create: {
            id: hostId,
            nickname: hostNickname,
            avatar,
            socketId: hostSocketId,
          },
        },
      },
    });
  } catch (e) {
    console.error('[DB] createRoom failed:', e.message);
  }

  return room;
}

/**
 * Add a player to an existing room.
 * @param {string} code
 * @param {string} socketId
 * @param {string} nickname
 * @param {string|null} existingPlayerId - for reconnects
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ room: object, player: object, error?: string }}
 */
async function joinRoom(code, socketId, nickname, existingPlayerId, prisma) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.status === 'FINISHED') return { error: 'Game already finished' };

  // Reconnect path
  if (existingPlayerId) {
    const existing = room.players.find((p) => p.id === existingPlayerId);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      try {
        await prisma.player.update({
          where: { id: existingPlayerId },
          data: { socketId, connected: true },
        });
      } catch (e) {}
      return { room, player: existing, reconnected: true };
    }
  }

  if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };
  if (room.status === 'PLAYING') return { error: 'Game already in progress' };

  const playerId = uuidv4();
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

  const player = {
    id: playerId,
    nickname,
    avatar,
    socketId,
    score: 0,
    connected: true,
  };

  room.players.push(player);
  room.expiresAt = Date.now() + ROOM_TTL_MS;

  try {
    await prisma.player.create({
      data: {
        id: playerId,
        nickname,
        avatar,
        socketId,
        roomId: (await prisma.room.findUnique({ where: { code } }))?.id ?? '',
      },
    });
  } catch (e) {
    console.error('[DB] joinRoom failed:', e.message);
  }

  return { room, player };
}

/**
 * Start the game (move to countdown/playing state).
 * @param {string} code
 * @param {Function} emitToRoom - (code, event, data) => void
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function startGame(code, emitToRoom, prisma) {
  const room = rooms.get(code);
  if (!room || room.status !== 'WAITING') return;

  clearTimeout(room.autoStartTimer);
  room.autoStartTimer = null;
  room.status = 'STARTING';

  emitToRoom(code, 'game_started', { players: room.players.map(publicPlayer) });

  // Begin round 1 after 1 s buffer
  setTimeout(() => startRound(code, emitToRoom, prisma), 1_000);
}

/**
 * Start a new round.
 */
async function startRound(code, emitToRoom, prisma) {
  const room = rooms.get(code);
  if (!room) return;

  room.currentRound += 1;
  room.status = 'PLAYING';
  const letter = pickLetter(room.usedLetters);
  room.usedLetters.push(letter);
  room.currentLetter = letter;

  const roundData = {
    id: uuidv4(),
    roomCode: code,
    roundNum: room.currentRound,
    letter,
    answers: {}, // playerId -> { name, place, animal, thing, submittedAt }
    startedAt: null,
  };
  room.rounds.push(roundData);

  // Persist round to DB
  try {
    const dbRoom = await prisma.room.findUnique({ where: { code } });
    if (dbRoom) {
      const dbRound = await prisma.round.create({
        data: {
          id: roundData.id,
          roomId: dbRoom.id,
          roundNum: room.currentRound,
          letter,
        },
      });
      roundData.dbRoundId = dbRound.id;
    }
  } catch (e) {
    console.error('[DB] startRound failed:', e.message);
  }

  // Emit countdown (5 s) then start
  emitToRoom(code, 'round_countdown', {
    round: room.currentRound,
    letter,
    totalRounds: TOTAL_ROUNDS,
    countdownMs: COUNTDOWN_MS,
  });

  setTimeout(() => {
    room.roundStartTs = Date.now();
    roundData.startedAt = room.roundStartTs;
    emitToRoom(code, 'round_started', {
      round: room.currentRound,
      letter,
      totalRounds: TOTAL_ROUNDS,
      durationMs: ROUND_DURATION_MS,
      startTs: room.roundStartTs,
    });

    // Auto-end after duration
    room.roundTimer = setTimeout(
      () => endRound(code, emitToRoom, prisma),
      ROUND_DURATION_MS
    );
  }, COUNTDOWN_MS);
}

/**
 * Record a player's answer submission.
 * @param {string} code
 * @param {string} playerId
 * @param {{ name:string, place:string, animal:string, thing:string }} answers
 * @param {Function} emitToRoom
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function submitAnswers(code, playerId, answers, emitToRoom, prisma) {
  const room = rooms.get(code);
  if (!room || room.status !== 'PLAYING') return;

  const currentRound = room.rounds[room.rounds.length - 1];
  if (!currentRound) return;
  if (currentRound.answers[playerId]) return; // already submitted

  currentRound.answers[playerId] = {
    ...sanitiseAnswers(answers),
    submittedAt: Date.now(),
  };

  // Notify others of submission (no answers revealed yet)
  emitToRoom(code, 'player_submitted', {
    playerId,
    submittedCount: Object.keys(currentRound.answers).length,
    totalPlayers: room.players.filter((p) => p.connected).length,
  });

  // If everyone submitted, end round early
  const connectedPlayers = room.players.filter((p) => p.connected);
  if (Object.keys(currentRound.answers).length >= connectedPlayers.length) {
    clearTimeout(room.roundTimer);
    // Small delay so UI can show "waiting..." briefly
    setTimeout(() => endRound(code, emitToRoom, prisma), 500);
  }
}

/**
 * End the current round, compute scores, emit results.
 */
async function endRound(code, emitToRoom, prisma) {
  const room = rooms.get(code);
  if (!room || room.status !== 'PLAYING') return;

  clearTimeout(room.roundTimer);
  room.roundTimer = null;

  const currentRound = room.rounds[room.rounds.length - 1];
  if (!currentRound) return;

  // Fill in missing answers with empty strings
  for (const p of room.players) {
    if (!currentRound.answers[p.id]) {
      currentRound.answers[p.id] = {
        name: '', place: '', animal: '', thing: '', submittedAt: null,
      };
    }
  }

  // Build input array for scoring
  const playerAnswers = room.players.map((p) => ({
    playerId: p.id,
    answers: currentRound.answers[p.id],
    submittedAt: currentRound.answers[p.id]?.submittedAt ?? null,
  }));

  const scoreResults = calculateRoundScores(playerAnswers);
  const answerTable = buildAnswerTable(
    room.players.map((p) => ({ playerId: p.id, nickname: p.nickname, answers: currentRound.answers[p.id] })),
    scoreResults
  );

  // Apply score deltas
  for (const sr of scoreResults) {
    const player = room.players.find((p) => p.id === sr.playerId);
    if (player) player.score += sr.scoreEarned;
  }

  currentRound.endedAt = Date.now();

  // Persist answers to DB
  try {
    if (currentRound.dbRoundId) {
      for (const pa of playerAnswers) {
        const sr = scoreResults.find((s) => s.playerId === pa.playerId);
        await prisma.answer.upsert({
          where: { roundId_playerId: { roundId: currentRound.dbRoundId, playerId: pa.playerId } },
          update: {
            name: pa.answers.name,
            place: pa.answers.place,
            animal: pa.answers.animal,
            thing: pa.answers.thing,
            submittedAt: pa.submittedAt ? new Date(pa.submittedAt) : null,
            isFirst: sr?.isFirst ?? false,
            scoreEarned: sr?.scoreEarned ?? 0,
          },
          create: {
            roundId: currentRound.dbRoundId,
            playerId: pa.playerId,
            name: pa.answers.name,
            place: pa.answers.place,
            animal: pa.answers.animal,
            thing: pa.answers.thing,
            submittedAt: pa.submittedAt ? new Date(pa.submittedAt) : null,
            isFirst: sr?.isFirst ?? false,
            scoreEarned: sr?.scoreEarned ?? 0,
          },
        });
      }
      // Update player scores in DB
      for (const p of room.players) {
        await prisma.player.update({ where: { id: p.id }, data: { score: p.score } }).catch(() => {});
      }
      await prisma.round.update({ where: { id: currentRound.dbRoundId }, data: { endedAt: new Date() } }).catch(() => {});
    }
  } catch (e) {
    console.error('[DB] endRound persist failed:', e.message);
  }

  const leaderboard = buildLeaderboard(room.players);

  emitToRoom(code, 'round_ended', {
    round: room.currentRound,
    letter: currentRound.letter,
    answerTable,
    scoreDeltas: scoreResults,
    leaderboard,
  });

  // Check if game over
  if (room.currentRound >= TOTAL_ROUNDS) {
    room.status = 'FINISHED';
    try {
      const dbRoom = await prisma.room.findUnique({ where: { code } });
      if (dbRoom) await prisma.room.update({ where: { id: dbRoom.id }, data: { status: 'FINISHED' } });
    } catch (e) {}

    setTimeout(() => {
      emitToRoom(code, 'game_over', { leaderboard });
    }, 500);
  }
}

/**
 * Advance to next round (called by host/client after results screen).
 */
async function nextRound(code, emitToRoom, prisma) {
  const room = rooms.get(code);
  if (!room || room.status === 'FINISHED' || room.status === 'WAITING') return;
  await startRound(code, emitToRoom, prisma);
}

/**
 * Handle player disconnect.
 */
function disconnectPlayer(socketId, emitToRoom) {
  for (const [code, room] of rooms.entries()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) continue;

    player.connected = false;

    emitToRoom(code, 'room_updated', {
      players: room.players.map(publicPlayer),
      status: room.status,
    });

    // If all players disconnected, mark room for cleanup
    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected) {
      room.status = 'FINISHED';
    }

    return { code, player };
  }
  return null;
}

function getRoom(code) {
  return rooms.get(code);
}

function publicPlayer(p) {
  return {
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    connected: p.connected,
    isHost: false, // overridden by caller if needed
  };
}

function buildLeaderboard(players) {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, ...publicPlayer(p) }));
}

function sanitiseAnswers(raw) {
  const safe = (s) => String(s || '').slice(0, 100);
  return {
    name: safe(raw.name),
    place: safe(raw.place),
    animal: safe(raw.animal),
    thing: safe(raw.thing),
  };
}

// Cleanup expired rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now > room.expiresAt) {
      clearTimeout(room.autoStartTimer);
      clearTimeout(room.roundTimer);
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1_000);

module.exports = {
  createRoom,
  joinRoom,
  startGame,
  submitAnswers,
  endRound,
  nextRound,
  disconnectPlayer,
  getRoom,
  publicPlayer,
  buildLeaderboard,
  AUTO_START_DELAY_MS,
};
