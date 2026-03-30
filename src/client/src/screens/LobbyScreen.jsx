import { useState, useEffect } from 'react';

const REACTIONS = ['👋', '😂', '🔥', '😤', '🎉'];

export default function LobbyScreen({
  roomCode,
  players,
  playerId,
  hostId,
  maxPlayers,
  autoStartMs,
  reactions,
  onStart,
  onReaction,
}) {
  const [countdown, setCountdown] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);

  const isHost = playerId === hostId;

  // Auto-start countdown
  useEffect(() => {
    if (!autoStartMs) return;
    const secs = Math.ceil(autoStartMs / 1000);
    setCountdown(secs);
    const id = setInterval(() => setCountdown((c) => (c <= 1 ? null : c - 1)), 1000);
    return () => clearInterval(id);
  }, [autoStartMs]);

  // Animate incoming reactions
  useEffect(() => {
    if (!reactions.length) return;
    const latest = reactions[reactions.length - 1];
    const id = Date.now();
    const left = 20 + Math.random() * 60; // % from left
    setFloatingReactions((prev) => [...prev, { ...latest, id, left }]);
    const t = setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1300);
    return () => clearTimeout(t);
  }, [reactions]);

  function copyCode() {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  }

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-8 flex flex-col gap-5">
      {/* Floating reactions */}
      {floatingReactions.map((r) => (
        <span
          key={r.id}
          className="reaction-pop"
          style={{ left: `${r.left}vw`, bottom: '120px' }}
        >
          {r.emoji}
        </span>
      ))}

      {/* Header */}
      <div className="text-center">
        <p className="font-nunito text-sm text-gray-500 mb-1">Share this code with friends</p>
        <button
          onClick={copyCode}
          className="font-baloo font-extrabold text-5xl text-purple-600 tracking-widest
                     hover:scale-105 active:scale-95 transition-transform"
          title="Tap to copy"
        >
          {roomCode}
        </button>
        <p className="text-xs text-gray-400 mt-1 font-nunito">tap to copy</p>
      </div>

      {/* Players list */}
      <div className="game-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-baloo font-bold text-gray-600">
            Players {players.length}/{maxPlayers}
          </span>
          {countdown !== null && (
            <span className="font-baloo font-bold text-purple-500 bg-purple-100 rounded-pill px-3 py-1 text-sm">
              Auto-start in {countdown}s
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-[16px] px-3 py-2
                ${p.id === playerId ? 'bg-purple-50 border-2 border-purple-200' : 'bg-white/60'}`}
            >
              <span className="text-2xl">{p.avatar}</span>
              <span className="font-nunito font-semibold text-gray-700 flex-1">{p.nickname}</span>
              {p.id === hostId && (
                <span className="text-xs font-bold text-amber-500 bg-amber-50 rounded-pill px-2 py-0.5">
                  Host 👑
                </span>
              )}
              {!p.connected && (
                <span className="text-xs text-gray-400">offline</span>
              )}
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-[16px] px-3 py-2 bg-white/30 border-2 border-dashed border-gray-200">
              <span className="text-2xl opacity-30">👤</span>
              <span className="font-nunito text-gray-300 text-sm">Waiting for player…</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reaction bar */}
      <div className="game-card p-3">
        <p className="font-nunito text-xs text-gray-400 text-center mb-2">Send a reaction</p>
        <div className="flex justify-center gap-3">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              className="text-2xl hover:scale-125 active:scale-95 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <div className="flex flex-col gap-2">
          <button
            onClick={onStart}
            disabled={players.length < 2}
            className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Game ▶️
          </button>
          {players.length < 2 && (
            <p className="text-center text-xs text-gray-400 font-nunito">Need at least 2 players</p>
          )}
        </div>
      )}

      {!isHost && (
        <p className="text-center font-nunito text-sm text-gray-400">
          Waiting for host to start…
        </p>
      )}
    </div>
  );
}
