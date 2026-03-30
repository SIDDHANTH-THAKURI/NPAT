import { useState } from 'react';

export default function HomeScreen({ onCreate, onJoin, error, clearError }) {
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    onCreate(nickname.trim(), maxPlayers);
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!nickname.trim() || !joinCode.trim()) return;
    onJoin(joinCode.trim().toUpperCase(), nickname.trim());
  }

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <div className="text-5xl mb-2">🎲</div>
        <h1 className="font-baloo font-extrabold text-3xl text-purple-600 leading-tight">
          Name Place<br />Animal Thing
        </h1>
        <p className="font-nunito text-gray-500 mt-1 text-sm">
          The classic word game, now multiplayer!
        </p>
      </div>

      {/* Nickname input (shared) */}
      <div className="game-card p-5">
        <label className="font-baloo font-bold text-gray-600 block mb-2">Your nickname</label>
        <input
          className="input-field"
          placeholder="e.g. Priya 🌸"
          maxLength={20}
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); clearError(); }}
        />
      </div>

      {/* Tabs */}
      <div className="flex rounded-pill bg-white/60 p-1 gap-1 shadow-sm">
        {['create', 'join'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); clearError(); }}
            className={`flex-1 font-baloo font-bold rounded-pill py-2 transition-all duration-150 text-sm capitalize
              ${tab === t ? 'bg-purple-400 text-white shadow' : 'text-purple-400'}`}
          >
            {t === 'create' ? '✨ Create Room' : '🔑 Join Room'}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate} className="game-card p-5 flex flex-col gap-4">
          <div>
            <label className="font-baloo font-bold text-gray-600 block mb-2">Players (2–6)</label>
            <div className="flex gap-2 flex-wrap">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxPlayers(n)}
                  className={`w-11 h-11 rounded-full font-baloo font-bold text-lg transition-all
                    ${maxPlayers === n
                      ? 'bg-purple-400 text-white shadow-md scale-105'
                      : 'bg-white text-purple-400 border-2 border-purple-200 hover:border-purple-400'
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-rose-500 font-nunito text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full text-lg">
            Create Room 🚀
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="game-card p-5 flex flex-col gap-4">
          <div>
            <label className="font-baloo font-bold text-gray-600 block mb-2">Room code</label>
            <input
              className="input-field uppercase tracking-widest text-center text-2xl font-baloo font-bold"
              placeholder="AB3X"
              maxLength={4}
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); clearError(); }}
            />
          </div>
          {error && <p className="text-rose-500 font-nunito text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full text-lg">
            Join Room 🎉
          </button>
        </form>
      )}

      {/* Info pills */}
      <div className="flex gap-2 flex-wrap justify-center">
        {['5 Rounds', '4 Categories', '60s per round', 'Real-time'].map((tag) => (
          <span key={tag} className="font-nunito text-xs font-semibold bg-white/70 text-purple-500 rounded-pill px-3 py-1 shadow-sm">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
