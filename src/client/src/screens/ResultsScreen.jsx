const CATEGORY_META = {
  name:   { label: 'Name',   color: 'bg-lavender', icon: '👤' },
  place:  { label: 'Place',  color: 'bg-skyblue',  icon: '🗺️' },
  animal: { label: 'Animal', color: 'bg-mint',     icon: '🐾' },
  thing:  { label: 'Thing',  color: 'bg-rose',     icon: '✨' },
};

export default function ResultsScreen({
  round,
  totalRounds,
  letter,
  answerTable,
  scoreDeltas,
  leaderboard,
  players,
  playerId,
  isHost,
  isLastRound,
  onNext,
}) {
  const scoreMap = {};
  for (const sd of (scoreDeltas || [])) {
    scoreMap[sd.playerId] = sd;
  }

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <p className="font-nunito text-sm text-gray-500">Round {round} of {totalRounds}</p>
        <h2 className="font-baloo font-extrabold text-4xl text-purple-600">
          Letter — {letter}
        </h2>
        <p className="font-nunito text-sm text-gray-400">Round results</p>
      </div>

      {/* Answer grid */}
      <div className="game-card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left font-baloo font-bold text-gray-500 pb-2 pr-2">Player</th>
              {Object.keys(CATEGORY_META).map((cat) => (
                <th key={cat} className="text-center font-baloo font-bold text-gray-500 pb-2 px-1">
                  {CATEGORY_META[cat].icon}
                </th>
              ))}
              <th className="text-right font-baloo font-bold text-gray-500 pb-2 pl-2">+pts</th>
            </tr>
          </thead>
          <tbody>
            {(leaderboard || []).map((entry) => {
              const sd = scoreMap[entry.id] || scoreMap[entry.playerId];
              const pid = entry.id || entry.playerId;
              return (
                <tr key={pid} className={pid === playerId ? 'bg-purple-50 rounded' : ''}>
                  <td className="py-1.5 pr-2 font-nunito font-semibold text-gray-700 whitespace-nowrap">
                    <span className="mr-1">{entry.avatar}</span>
                    {entry.nickname}
                    {sd?.isFirst && (
                      <span className="ml-1 text-xs text-amber-500 font-bold">⚡+5</span>
                    )}
                  </td>
                  {Object.keys(CATEGORY_META).map((cat) => {
                    const cell = answerTable?.[cat]?.[pid];
                    const pts = cell?.pts || 0;
                    const unique = cell?.unique;
                    const val = cell?.value || '';
                    return (
                      <td key={cat} className="px-1 py-1.5 text-center">
                        <div
                          className={`${CATEGORY_META[cat].color} rounded-[8px] px-1.5 py-1 text-xs
                            ${unique ? 'ring-2 ring-yellow-300' : ''}
                            ${!val ? 'opacity-30' : ''}`}
                          title={unique ? 'Unique! +15' : pts === 10 ? 'Shared +10' : ''}
                        >
                          <div className="font-nunito font-semibold text-gray-700 truncate max-w-[70px]">
                            {val || '—'}
                          </div>
                          {val && (
                            <div className="text-xs text-gray-500">+{pts}</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="pl-2 text-right">
                    <span className="font-baloo font-bold text-purple-600 bg-purple-100 rounded-pill px-2 py-0.5 text-sm">
                      +{sd?.scoreEarned ?? 0}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leaderboard */}
      <div className="game-card p-4">
        <h3 className="font-baloo font-bold text-gray-600 mb-3">🏆 Standings</h3>
        {(leaderboard || []).map((entry, i) => {
          const pid = entry.id || entry.playerId;
          return (
            <div
              key={pid}
              className={`flex items-center gap-3 rounded-[12px] px-3 py-2 mb-1
                ${pid === playerId ? 'bg-purple-50' : ''}`}
            >
              <span className="font-baloo font-bold text-gray-400 w-6 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="text-xl">{entry.avatar}</span>
              <span className="font-nunito font-semibold text-gray-700 flex-1">{entry.nickname}</span>
              <span className="font-baloo font-bold text-purple-600">{entry.score} pts</span>
            </div>
          );
        })}
      </div>

      {/* Continue button — host only */}
      {isHost && (
        <button onClick={onNext} className="btn-primary w-full text-lg">
          {isLastRound ? '🏁 See Final Results' : '▶️ Next Round'}
        </button>
      )}
      {!isHost && (
        <p className="text-center font-nunito text-sm text-gray-400">
          Waiting for host to continue…
        </p>
      )}
    </div>
  );
}
