# 🎲 Name Place Animal Thing — Multiplayer

A real-time multiplayer word game built with React + Vite, Node.js + Socket.io, and PostgreSQL.

## Tech Stack

| Layer    | Tech                                         |
|----------|----------------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS                 |
| Backend  | Node.js, Express, Socket.io                  |
| Database | PostgreSQL via Prisma ORM                    |
| Deploy   | Docker + docker-compose                      |

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally **or** Docker

### 1. Clone & install

```bash
git clone <repo-url>
cd NPAT

# Install all workspace deps (root + client + server)
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your local Postgres instance
# e.g. DATABASE_URL="postgresql://postgres:password@localhost:5432/npat_db"
```

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate
```

### 4. Run dev servers

```bash
npm run dev
```

This starts:
- **React dev server** at http://localhost:5173
- **Node/Socket.io server** at http://localhost:3001

Open http://localhost:5173 in two separate browser tabs to test multiplayer.

---

## Run with Docker (Recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# Build and start everything (app + postgres)
docker-compose up --build

# App will be available at http://localhost:3001
```

To stop:
```bash
docker-compose down
```

To wipe the database too:
```bash
docker-compose down -v
```

---

## Project Structure

```
NPAT/
├── src/
│   ├── client/                  # React app (Vite)
│   │   ├── src/
│   │   │   ├── components/      # Shared UI components
│   │   │   ├── screens/         # One file per screen
│   │   │   │   ├── HomeScreen.jsx
│   │   │   │   ├── LobbyScreen.jsx
│   │   │   │   ├── CountdownScreen.jsx
│   │   │   │   ├── GameScreen.jsx
│   │   │   │   ├── ResultsScreen.jsx
│   │   │   │   └── PodiumScreen.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGame.js      # Main game state + socket events
│   │   │   │   └── useCountdown.js # Timer helpers
│   │   │   └── socket.js           # Socket.io client singleton
│   │   ├── index.html
│   │   ├── tailwind.config.js
│   │   └── vite.config.js
│   │
│   ├── server/                  # Node.js backend
│   │   ├── index.js             # Express + Socket.io entry point
│   │   ├── gameLogic.js         # Pure scoring functions (no side effects)
│   │   ├── roomManager.js       # Room/player state + game lifecycle
│   │   └── entrypoint.sh        # Docker startup (migrations + server)
│   │
│   └── prisma/
│       ├── schema.prisma        # DB schema
│       └── migrations/          # SQL migration files
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## Socket.io Events Reference

### Client → Server

| Event            | Payload                                              | Description                        |
|------------------|------------------------------------------------------|------------------------------------|
| `create_room`    | `{ nickname, maxPlayers }`                           | Create a new room                  |
| `join_room`      | `{ code, nickname, playerId? }`                      | Join existing room (or reconnect)  |
| `start_game`     | `{ code }`                                           | Host starts the game               |
| `submit_answers` | `{ code, answers: {name,place,animal,thing} }`       | Submit round answers               |
| `next_round`     | `{ code }`                                           | Host advances to next round        |
| `send_reaction`  | `{ code, emoji }`                                    | Send emoji reaction in lobby       |

### Server → Client

| Event                | Payload                                             | Description                          |
|----------------------|-----------------------------------------------------|--------------------------------------|
| `room_updated`       | `{ code, hostId, players, status, playerId }`       | Room state changed (join/leave/etc.) |
| `game_started`       | `{ players }`                                       | Game is starting                     |
| `round_countdown`    | `{ round, letter, totalRounds, countdownMs }`       | 5-second letter reveal countdown     |
| `round_started`      | `{ round, letter, totalRounds, durationMs, startTs }` | Round is live — timer begins       |
| `player_submitted`   | `{ playerId, submittedCount, totalPlayers }`        | A player submitted their answers     |
| `round_ended`        | `{ round, letter, answerTable, scoreDeltas, leaderboard }` | Round over with scores        |
| `game_over`          | `{ leaderboard }`                                   | All rounds complete                  |
| `auto_start_countdown` | `{ delayMs }`                                     | Room full — auto-start in N ms       |
| `reaction`           | `{ playerId, nickname, emoji }`                     | Emoji reaction from a player         |
| `join_error`         | `{ message }`                                       | Failed to join room                  |
| `start_error`        | `{ message }`                                       | Failed to start game                 |

---

## Game Rules

- **4 categories**: Name, Place, Animal, Thing
- **5 rounds**, each with a randomly picked letter
- **60 seconds** per round to fill all 4 categories
- **Scoring** (server-side, never trusted from client):
  - +15 pts — unique answer (only you had it)
  - +10 pts — shared answer (someone else matched)
  - +5 pts  — first player to submit in the round
- **Podium** shown after round 5

---

## Reconnection

Players can reconnect mid-game. Their `playerId` is stored in `localStorage`. On reconnect, the server looks up their existing player record and restores their session.

---

## Environment Variables

| Variable        | Default                     | Description                  |
|-----------------|-----------------------------|------------------------------|
| `DATABASE_URL`  | —                           | PostgreSQL connection string |
| `PORT`          | `3001`                      | Server port                  |
| `CLIENT_ORIGIN` | `http://localhost:5173`     | CORS allowed origin          |

---

## Scripts

| Command              | Description                            |
|----------------------|----------------------------------------|
| `npm run dev`        | Start both client and server in dev    |
| `npm run build`      | Build React client for production      |
| `npm run start`      | Start production server                |
| `npm run db:generate`| Re-generate Prisma client              |
| `npm run db:migrate` | Apply DB migrations                    |
| `npm run db:studio`  | Open Prisma Studio (DB GUI)            |
