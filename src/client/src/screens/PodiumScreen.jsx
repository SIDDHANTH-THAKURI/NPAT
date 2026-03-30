export default function PodiumScreen({ leaderboard, onPlayAgain }) {
  const sorted = [...(leaderboard || [])].sort((a, b) => b.score - a.score);

  // Visual podium: 1st tallest, 2nd medium, 3rd shorter
  const podiumSlots = [
    { rank: 2, height: 'h-28', color: 'bg-gray-200',  label: '🥈', delay: '0.1s' },
    { rank: 1, height: 'h-40', color: 'bg-yellow-300', label: '🥇', delay: '0s'   },
    { rank: 3, height: 'h-20', color: 'bg-amber-400',  label: '🥉', delay: '0.2s' },
  ];

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Confetti header */}
      <div className="text-center">
        <div className="text-4xl mb-1">🎊🎉🎊</div>
        <h2 className="font-baloo font-extrabold text-3xl text-purple-600">Game Over!</h2>
        <p className="font-nunito text-gray-500 text-sm mt-1">Final standings</p>
      </div>

      {/* Visual podium */}
      <div className="flex items-end justify-center gap-3 px-4 pb-2">
        {podiumSlots.map(({ rank, height, color, label, delay }) => {
          const player = sorted[rank - 1];
          if (!player) return <div key={rank} className={`flex-1 ${height}`} />;
          return (
            <div key={rank} className="flex flex-col items-center flex-1">
              <div className="text-3xl mb-1">{player.avatar}</div>
              <div className="font-nunito font-bold text-xs text-gray-700 text-center mb-1 truncate w-full text-center">
                {player.nickname}
              </div>
              <div className="font-baloo font-bold text-sm text-purple-600 mb-1">
                {player.score}pts
              </div>
              <div
                className={`podium-block w-full ${height} ${color} rounded-t-[16px] flex items-start justify-center pt-2`}
                style={{ animationDelay: delay }}
              >
                <span className="text-2xl">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full ranking */}
      <div className="game-card p-4 flex flex-col gap-2">
        <h3 className="font-baloo font-bold text-gray-600 mb-1">Full Rankings</h3>
        {sorted.map((entry, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const pid = entry.id || entry.playerId;
          return (
            <div
              key={pid}
              className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5
                ${i === 0 ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-white/50'}`}
            >
              <span className="font-baloo font-extrabold text-xl w-8 text-center">
                {medal || `#${i + 1}`}
              </span>
              <span className="text-2xl">{entry.avatar}</span>
              <span className="font-nunito font-bold text-gray-700 flex-1">{entry.nickname}</span>
              <span className="font-baloo font-extrabold text-purple-600 text-lg">
                {entry.score}
                <span className="text-xs font-nunito font-normal text-gray-400 ml-1">pts</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Score legend */}
      <div className="game-card p-3 text-xs font-nunito text-gray-500 flex flex-col gap-1">
        <p className="font-bold text-gray-600 mb-1">Scoring recap</p>
        <p>🌟 <strong>+15</strong> — Unique answer (only you had it)</p>
        <p>🤝 <strong>+10</strong> — Shared answer (others had the same)</p>
        <p>⚡ <strong>+5</strong>  — First to submit the round</p>
      </div>

      {/* Play Again */}
      <button onClick={onPlayAgain} className="btn-primary w-full text-lg">
        🔄 Play Again
      </button>
    </div>
  );
}
