import { useEffect, useState } from 'react';

export default function CountdownScreen({ round, totalRounds, letter, countdownMs }) {
  const totalSecs = Math.ceil(countdownMs / 1000);
  const [secs, setSecs] = useState(totalSecs);
  const [letterVisible, setLetterVisible] = useState(false);

  useEffect(() => {
    setSecs(totalSecs);
    setLetterVisible(false);
    const t = setTimeout(() => setLetterVisible(true), 300);
    const id = setInterval(() => setSecs((c) => Math.max(0, c - 1)), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [totalSecs, letter]);

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 flex flex-col items-center justify-center min-h-[80dvh] gap-6">
      <div className="font-nunito text-gray-500 text-sm font-semibold tracking-wide">
        ROUND {round} OF {totalRounds}
      </div>

      <div className="text-center">
        <p className="font-baloo font-bold text-gray-500 text-lg mb-4">Get ready! The letter is…</p>

        {letterVisible && (
          <div
            key={letter}
            className="letter-bounce inline-flex items-center justify-center
                       w-40 h-40 rounded-[32px] bg-white shadow-xl
                       font-baloo font-extrabold text-8xl text-purple-500"
          >
            {letter}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="font-baloo font-bold text-3xl text-purple-400">{secs}</div>
        <div className="font-nunito text-gray-400">seconds</div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { label: 'Name', color: 'bg-lavender' },
          { label: 'Place', color: 'bg-skyblue' },
          { label: 'Animal', color: 'bg-mint' },
          { label: 'Thing', color: 'bg-rose' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className={`${color} font-baloo font-bold rounded-pill px-4 py-1.5 text-gray-700 shadow-sm`}
          >
            {label}
          </span>
        ))}
      </div>

      <p className="font-nunito text-gray-400 text-sm text-center">
        Think of words starting with <strong className="text-purple-500">{letter}</strong> for each category!
      </p>
    </div>
  );
}
