/**
 * Deterministic-friendly randomisation helpers.
 *
 * Every function accepts an optional `rng` so tests can pass a seeded or
 * predictable generator instead of relying on Math.random.
 */

/**
 * Return a random floating point number in [0, 1).
 * @param {() => number} [rng]
 */
function randomValue(rng) {
  return typeof rng === "function" ? rng() : Math.random();
}

/**
 * Fisher-Yates shuffle. The input array is never mutated.
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng]
 * @returns {T[]} a new shuffled array
 */
export function shuffle(items, rng) {
  const result = Array.isArray(items) ? [...items] : [];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomValue(rng) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick up to `count` unique items, in random order.
 * @template T
 * @param {T[]} items
 * @param {number} count
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function sample(items, count, rng) {
  const list = Array.isArray(items) ? items : [];
  const limit = Math.max(0, Math.min(Number(count) || 0, list.length));
  return shuffle(list, rng).slice(0, limit);
}

/**
 * Choose one item at random, or null for an empty list.
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng]
 * @returns {T | null}
 */
export function pickOne(items, rng) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  return list[Math.floor(randomValue(rng) * list.length)];
}

/**
 * Create a small deterministic pseudo-random generator (mulberry32).
 * Useful for reproducible puzzles and tests.
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
