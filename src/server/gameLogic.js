'use strict';

/**
 * Pure scoring and game logic functions (no side effects, no DB calls)
 */

const LETTERS = 'ABCDEFGHIJKLMNOPRSTW'.split('');
const CATEGORIES = ['name', 'place', 'animal', 'thing'];

const SCORE_UNIQUE = 15;
const SCORE_SHARED = 10;
const SCORE_FIRST_SUBMIT = 5;
const TOTAL_ROUNDS = 5;

/**
 * Pick a random letter for a round, avoiding recently used letters.
 * @param {string[]} usedLetters - Letters already used in this game
 * @returns {string} A single uppercase letter
 */
function pickLetter(usedLetters = []) {
  const available = LETTERS.filter((l) => !usedLetters.includes(l));
  const pool = available.length > 0 ? available : LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Normalise an answer string for comparison (lowercase, trimmed).
 * @param {string} str
 * @returns {string}
 */
function normalise(str) {
  return (str || '').trim().toLowerCase();
}

/**
 * Calculate score deltas for one round given all player answers.
 *
 * @param {Array<{playerId: string, answers: {name:string, place:string, animal:string, thing:string}, submittedAt: number|null}>} playerAnswers
 * @returns {Array<{playerId: string, scoreEarned: number, isFirst: boolean, breakdown: {name:number, place:number, animal:number, thing:number}}>}
 */
function calculateRoundScores(playerAnswers) {
  // Find first submission (lowest submittedAt timestamp, must not be null)
  const submitted = playerAnswers.filter((p) => p.submittedAt !== null);
  let firstPlayerId = null;
  if (submitted.length > 0) {
    submitted.sort((a, b) => a.submittedAt - b.submittedAt);
    firstPlayerId = submitted[0].playerId;
  }

  // For each category, count how many players gave each normalised answer (ignoring empty)
  const categoryCounts = {};
  for (const cat of CATEGORIES) {
    const counts = {};
    for (const pa of playerAnswers) {
      const norm = normalise(pa.answers[cat]);
      if (!norm) continue;
      counts[norm] = (counts[norm] || 0) + 1;
    }
    categoryCounts[cat] = counts;
  }

  // Compute per-player scores
  return playerAnswers.map((pa) => {
    let scoreEarned = 0;
    const breakdown = {};

    for (const cat of CATEGORIES) {
      const norm = normalise(pa.answers[cat]);
      if (!norm) {
        breakdown[cat] = 0;
        continue;
      }
      const count = categoryCounts[cat][norm] || 0;
      const pts = count === 1 ? SCORE_UNIQUE : SCORE_SHARED;
      breakdown[cat] = pts;
      scoreEarned += pts;
    }

    const isFirst = pa.playerId === firstPlayerId && submitted.length > 0;
    if (isFirst) scoreEarned += SCORE_FIRST_SUBMIT;

    return {
      playerId: pa.playerId,
      scoreEarned,
      isFirst,
      breakdown,
    };
  });
}

/**
 * Build the answer comparison table for results screen.
 * @param {Array<{playerId: string, nickname: string, answers: object}>} playerAnswers
 * @returns {object} { category: { playerId: { value, pts, unique } } }
 */
function buildAnswerTable(playerAnswers, scoreResults) {
  const scoreMap = {};
  for (const sr of scoreResults) {
    scoreMap[sr.playerId] = sr;
  }

  const table = {};
  for (const cat of CATEGORIES) {
    table[cat] = {};
    for (const pa of playerAnswers) {
      const norm = normalise(pa.answers[cat]);
      const breakdown = scoreMap[pa.playerId]?.breakdown || {};
      table[cat][pa.playerId] = {
        value: pa.answers[cat] || '',
        pts: breakdown[cat] || 0,
        unique: breakdown[cat] === SCORE_UNIQUE && norm !== '',
      };
    }
  }
  return table;
}

module.exports = {
  pickLetter,
  normalise,
  calculateRoundScores,
  buildAnswerTable,
  CATEGORIES,
  TOTAL_ROUNDS,
  SCORE_UNIQUE,
  SCORE_SHARED,
  SCORE_FIRST_SUBMIT,
};
