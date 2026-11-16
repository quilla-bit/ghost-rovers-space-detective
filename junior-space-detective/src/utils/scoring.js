import {
  HINT_PENALTY_POINTS,
  MIN_SCORE_FACTOR,
  POINTS_BY_DIFFICULTY,
} from "./constants.js";

/**
 * Centralised scoring rules. Nothing else in the application may compute
 * points directly, which keeps the quiz and decoder engines consistent.
 */

/**
 * Points available for a correct answer, after hint penalties.
 *
 * Each hint removes HINT_PENALTY_POINTS, but an answer is always worth at
 * least MIN_SCORE_FACTOR of its base value so a curious player still earns
 * something for solving a puzzle.
 *
 * @param {"beginner"|"intermediate"|"advanced"} difficulty
 * @param {number} [hintsUsed=0]
 * @returns {number} integer points, never negative
 */
export function getAnswerPoints(difficulty, hintsUsed = 0) {
  const base = POINTS_BY_DIFFICULTY[difficulty];
  if (typeof base !== "number") {
    throw new Error(`Unknown difficulty: ${difficulty}`);
  }
  const hints = Math.max(0, Math.floor(Number(hintsUsed) || 0));
  const penalty = hints * HINT_PENALTY_POINTS;
  const floor = Math.ceil(base * MIN_SCORE_FACTOR);
  return Math.max(floor, base - penalty);
}

/**
 * Score a decoder puzzle. Identical rule set to quiz answers, exposed
 * separately so the decoder can quote puzzle-defined base points.
 *
 * @param {number} basePoints
 * @param {number} [hintsUsed=0]
 * @returns {number}
 */
export function getDecoderPoints(basePoints, hintsUsed = 0) {
  const base = Math.max(0, Math.floor(Number(basePoints) || 0));
  const hints = Math.max(0, Math.floor(Number(hintsUsed) || 0));
  const floor = Math.ceil(base * MIN_SCORE_FACTOR);
  return Math.max(base === 0 ? 0 : floor, base - hints * HINT_PENALTY_POINTS);
}

/**
 * Percentage of correct answers, rounded to a whole number.
 * @param {number} correct
 * @param {number} total
 * @returns {number} 0 when nothing has been answered
 */
export function calculateAccuracy(correct, total) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCorrect = Math.max(0, Math.min(Number(correct) || 0, safeTotal));
  if (safeTotal === 0) return 0;
  return Math.round((safeCorrect / safeTotal) * 100);
}

/**
 * Build a per-difficulty breakdown from answered question records.
 *
 * @param {Array<{difficulty: string, correct: boolean, pointsEarned: number}>} answers
 * @returns {Record<string, {total: number, correct: number, incorrect: number, points: number}>}
 */
export function buildDifficultyBreakdown(answers) {
  const breakdown = {};
  for (const answer of Array.isArray(answers) ? answers : []) {
    const key = answer && answer.difficulty ? answer.difficulty : "unknown";
    if (!breakdown[key]) {
      breakdown[key] = { total: 0, correct: 0, incorrect: 0, points: 0 };
    }
    const entry = breakdown[key];
    entry.total += 1;
    entry.points += Number(answer.pointsEarned) || 0;
    if (answer.correct) {
      entry.correct += 1;
    } else {
      entry.incorrect += 1;
    }
  }
  return breakdown;
}

/**
 * Sum the points of a list of scored answers.
 * @param {Array<{pointsEarned?: number}>} answers
 * @returns {number}
 */
export function sumPoints(answers) {
  return (Array.isArray(answers) ? answers : []).reduce(
    (total, answer) => total + (Number(answer?.pointsEarned) || 0),
    0,
  );
}
