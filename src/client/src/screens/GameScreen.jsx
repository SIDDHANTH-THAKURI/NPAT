import { useState } from 'react';
import { useTimerSync } from '../hooks/useCountdown';

const CATEGORIES = [
  { key: 'name',   label: 'Name',   color: 'bg-lavender', border: 'border-purple-200', icon: '👤' },
  { key: 'place',  label: 'Place',  color: 'bg-skyblue',  border: 'border-sky-200',    icon: '🗺️' },
  { key: 'animal', label: 'Animal', color: 'bg-mint',     border: 'border-green-200',  icon: '🐾' },
  { key: 'thing',  label: 'Thing',  color: 'bg-rose',     border: 'border-pink-200',   icon: '✨' },
];

function formatTime(ms) {
  const secs = Math.ceil(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function GameScreen({
  round,
  totalRounds,
  letter,
  durationMs,
  startTs,
  submitted,
  submittedCount,
  totalConnected,
  players,
  playerId,
  onSubmit,
}) {
  const [answers, setAnswers] = useState({ name: '', place: '', animal: '', thing: '' });
  const { fraction, remaining, urgent } = useTimerSync(startTs, durationMs);

  function handleDone(e) {
    e.preventDefault();
    if (submitted) return;
    onSubmit(answers);
  }

  const pct = Math.max(0, (1 - fraction) * 100);

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Top bar */}
      <div className="game-card p-3 flex items-center gap-3">
        {/* Round */}
        <span className="font-nunito text-xs font-semibold text-gray-500 whitespace-nowrap">
          Round {round}/{totalRounds}
        </span>

        {/* Big letter */}
        <div className="flex-shrink-0 w-12 h-12 rounded-[12px] bg-purple-400 flex items-center justify-center
                        font-baloo font-extrabold text-2xl text-white shadow-sm">
          {letter}
        </div>

        {/* Timer bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-xs font-nunito">
            <span className={urgent ? 'text-rose-500 font-bold timer-urgent' : 'text-gray-500'}>
              {formatTime(remaining)}
            </span>
            <span className="text-gray-400">{submittedCount}/{totalConnected} done</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                urgent ? 'bg-rose-400' : pct > 50 ? 'bg-purple-400' : 'bg-amber-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Input cards */}
      <form onSubmit={handleDone} className="flex flex-col gap-3">
        {CATEGORIES.map(({ key, label, color, border, icon }) => (
          <div key={key} className={`${color} rounded-[24px] p-4 shadow-sm border-2 ${border}`}>
            <label className="flex items-center gap-2 font-baloo font-bold text-gray-700 mb-2">
              <span>{icon}</span>
              <span>{label}</span>
            </label>
            <input
              className="w-full rounded-[12px] border-0 bg-white/70 px-3 py-2.5 font-nunito
                         text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-purple-300 transition-all"
              placeholder={`${label} starting with ${letter}…`}
              value={answers[key]}
              disabled={submitted}
              onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
              maxLength={100}
              autoComplete="off"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={submitted}
          className="btn-primary w-full text-lg mt-1 disabled:opacity-60"
        >
          {submitted ? '✅ Submitted! Waiting…' : '✋ Done!'}
        </button>
      </form>

      {/* Player status chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {players.map((p) => {
          const hasSubmitted = /* we track via submittedCount, show visual cue */ false;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-nunito font-semibold
                ${p.id === playerId ? 'bg-purple-100 text-purple-600' : 'bg-white/60 text-gray-500'}`}
            >
              <span>{p.avatar}</span>
              <span>{p.nickname}</span>
              {!p.connected && <span className="opacity-50">💤</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
