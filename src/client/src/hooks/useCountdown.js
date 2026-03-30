import { useState, useEffect, useRef } from 'react';

/**
 * Returns elapsed fraction (0→1) based on a server-provided start timestamp.
 * @param {number|null} startTs - Unix ms when round started
 * @param {number} durationMs   - Total round duration in ms
 * @returns {{ fraction: number, remaining: number, urgent: boolean }}
 */
export function useTimerSync(startTs, durationMs) {
  const [now, setNow] = useState(Date.now());
  const raf = useRef(null);

  useEffect(() => {
    if (!startTs) return;
    const tick = () => {
      setNow(Date.now());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [startTs]);

  if (!startTs) return { fraction: 0, remaining: durationMs, urgent: false };

  const elapsed = now - startTs;
  const remaining = Math.max(0, durationMs - elapsed);
  const fraction = Math.min(1, elapsed / durationMs);
  const urgent = remaining < 10_000;

  return { fraction, remaining, urgent };
}

/**
 * Simple countdown from N seconds, ticking every second.
 * @param {number} seconds
 * @param {boolean} active
 * @returns {number} seconds remaining
 */
export function useSecondCountdown(seconds, active) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    setCount(seconds);
    if (!active) return;
    const id = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds, active]);

  return count;
}
