import {
  DECODER_STATES,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_PUZZLE_COUNT,
} from "../utils/constants.js";
import { getDecoderPoints } from "../utils/scoring.js";
import { answersMatch, normalizeAnswer, validateAnswerInput } from "../utils/validation.js";
import { sample } from "../utils/randomization.js";

/**
 * Decoder minigame state machine.
 *
 *   IDLE -> PUZZLE_ACTIVE -> COMPLETED            (correct answer)
 *                        -> RETRY_AVAILABLE      (incorrect, attempts left)
 *                        -> NEXT_PUZZLE          (attempts exhausted)
 *   COMPLETED / NEXT_PUZZLE -> PUZZLE_ACTIVE      (completePuzzle / next puzzle)
 *
 * Like the quiz engine this module is pure: the state object is immutable and
 * every transition returns `{ state, result }`.
 *
 * All messages are simulated educational puzzles, never real transmissions.
 */

/**
 * @typedef {Object} DecoderState
 * @property {string} status
 * @property {Array<Object>} puzzles - puzzle queue (internal, contains answers)
 * @property {number} currentIndex
 * @property {number} attempts
 * @property {number} hintsUsed
 * @property {string} input - last submitted text, for UI display
 * @property {number} score
 * @property {Array<Object>} history
 * @property {boolean} runComplete
 */

/**
 * Prepare a decoder run.
 *
 * @param {Object} options
 * @param {Array<Object>} options.puzzles
 * @param {number} [options.puzzleCount=5]
 * @param {string[]|null} [options.difficulties=null]
 * @param {() => number} [options.rng]
 * @returns {DecoderState}
 */
export function initializeDecoder({
  puzzles,
  puzzleCount = DEFAULT_PUZZLE_COUNT,
  difficulties = null,
  rng,
} = {}) {
  if (!Array.isArray(puzzles) || puzzles.length === 0) {
    throw new Error("initializeDecoder requires at least one puzzle.");
  }

  let pool = puzzles.filter((puzzle) => puzzle && puzzle.id);
  if (Array.isArray(difficulties) && difficulties.length > 0) {
    const allowed = new Set(difficulties);
    const filtered = pool.filter((puzzle) => allowed.has(puzzle.difficulty));
    if (filtered.length === 0) {
      throw new Error("No puzzles match the selected difficulty.");
    }
    pool = filtered;
  }

  const seen = new Set();
  pool = pool.filter((puzzle) => {
    if (seen.has(puzzle.id)) return false;
    seen.add(puzzle.id);
    return true;
  });

  const requested = Number.isFinite(Number(puzzleCount))
    ? Math.floor(Number(puzzleCount))
    : DEFAULT_PUZZLE_COUNT;
  const count = Math.max(1, Math.min(requested, pool.length));

  return {
    status: DECODER_STATES.IDLE,
    puzzles: sample(pool, count, rng),
    // Original bank, retained so resetDecoder can draw a fresh queue.
    pool: puzzles,
    currentIndex: 0,
    attempts: 0,
    hintsUsed: 0,
    hintsRevealed: [],
    input: "",
    score: 0,
    history: [],
    runComplete: false,
    startedAt: null,
    puzzleStartedAt: null,
    completedAt: null,
  };
}

/** @param {DecoderState} state */
export function getCurrentPuzzle(state) {
  if (!state || !Array.isArray(state.puzzles)) return null;
  const puzzle = state.puzzles[state.currentIndex];
  if (!puzzle) return null;
  // Strip the answer key from the player-facing payload.
  const { correctAnswer, acceptedAnswers, ...rest } = puzzle;
  return rest;
}

/** @param {DecoderState} state */
export function hasNextPuzzle(state) {
  if (!state) return false;
  return state.currentIndex < state.puzzles.length - 1;
}

/**
 * Load the current puzzle and enter PUZZLE_ACTIVE.
 * Calling startPuzzle while a puzzle is already active returns a rejection
 * rather than restarting the attempt counter.
 *
 * @param {DecoderState} state
 * @param {() => Date} [now]
 */
export function startPuzzle(state, now = () => new Date()) {
  if (!state) return { state, result: { started: false, reason: "No decoder state." } };
  if (
    state.status === DECODER_STATES.PUZZLE_ACTIVE ||
    state.status === DECODER_STATES.RETRY_AVAILABLE
  ) {
    return {
      state,
      result: { started: false, reason: "A puzzle is already in progress." },
    };
  }
  const puzzle = state.puzzles[state.currentIndex];
  if (!puzzle) {
    return { state, result: { started: false, reason: "No puzzles remain." } };
  }

  return {
    state: {
      ...state,
      status: DECODER_STATES.PUZZLE_ACTIVE,
      attempts: 0,
      hintsUsed: 0,
      hintsRevealed: [],
      input: "",
      startedAt: state.startedAt || now().toISOString(),
      puzzleStartedAt: now().toISOString(),
      completedAt: null,
    },
    result: { started: true, puzzleId: puzzle.id },
  };
}

/**
 * Submit a decoded answer.
 *
 * @param {DecoderState} state
 * @param {string} input
 * @param {() => Date} [now]
 * @returns {{state: DecoderState, result: Object}}
 */
export function submitDecoderAnswer(state, input, now = () => new Date()) {
  const rejected = (reason) => ({ state, result: { accepted: false, reason } });

  if (!state) return rejected("No decoder state.");
  if (
    state.status !== DECODER_STATES.PUZZLE_ACTIVE &&
    state.status !== DECODER_STATES.RETRY_AVAILABLE
  ) {
    return rejected("This puzzle is not accepting answers.");
  }

  const puzzle = state.puzzles[state.currentIndex];
  if (!puzzle) return rejected("No puzzle is available.");

  const validation = validateAnswerInput(input);
  if (!validation.valid) {
    return rejected(validation.reason || "Enter a valid answer.");
  }

  const accepted = [puzzle.correctAnswer, ...(puzzle.acceptedAnswers || [])];
  const correct = answersMatch(input, accepted);
  const attempts = state.attempts + 1;

  if (correct) {
    const pointsEarned = getDecoderPoints(puzzle.points, state.hintsUsed);
    const completedAt = now().toISOString();
    const historyEntry = {
      puzzleId: puzzle.id,
      artifactId: puzzle.artifactId,
      difficulty: puzzle.difficulty,
      solved: true,
      attempts,
      hintsUsed: state.hintsUsed,
      pointsEarned,
      completedAt,
    };

    return {
      state: {
        ...state,
        status: DECODER_STATES.COMPLETED,
        attempts,
        input,
        score: state.score + pointsEarned,
        history: [...state.history, historyEntry],
        completedAt,
      },
      result: {
        accepted: true,
        correct: true,
        pointsEarned,
        answer: puzzle.correctAnswer,
        explanation: puzzle.explanation,
        attempts,
        hasNext: hasNextPuzzle(state),
        message: `Decoded! +${pointsEarned} points`,
      },
    };
  }

  const maxAttempts =
    typeof puzzle.maxAttempts === "number" && puzzle.maxAttempts > 0
      ? puzzle.maxAttempts
      : DEFAULT_MAX_ATTEMPTS;
  const exhausted = attempts >= maxAttempts;

  if (exhausted) {
    const completedAt = now().toISOString();
    return {
      state: {
        ...state,
        status: DECODER_STATES.NEXT_PUZZLE,
        attempts,
        input,
        completedAt,
        history: [
          ...state.history,
          {
            puzzleId: puzzle.id,
            artifactId: puzzle.artifactId,
            difficulty: puzzle.difficulty,
            solved: false,
            attempts,
            hintsUsed: state.hintsUsed,
            pointsEarned: 0,
            completedAt,
          },
        ],
      },
      result: {
        accepted: true,
        correct: false,
        attempts,
        attemptsRemaining: 0,
        exceededAttempts: true,
        answer: puzzle.correctAnswer,
        explanation: puzzle.explanation,
        hasNext: hasNextPuzzle(state),
        message: `Out of attempts. The answer was ${puzzle.correctAnswer}.`,
      },
    };
  }

  return {
    state: {
      ...state,
      status: DECODER_STATES.RETRY_AVAILABLE,
      attempts,
      input,
    },
    result: {
      accepted: true,
      correct: false,
      attempts,
      attemptsRemaining: maxAttempts - attempts,
      exceededAttempts: false,
      message: `Not quite. ${maxAttempts - attempts} attempt${
        maxAttempts - attempts === 1 ? "" : "s"
      } left.`,
    },
  };
}

/**
 * Reveal the next progressive hint. Repeated calls cannot spend more hints
 * than the puzzle provides, and hints are unavailable once a puzzle is solved.
 *
 * @param {DecoderState} state
 */
export function requestHint(state) {
  const rejected = (reason) => ({ state, result: { revealed: false, reason } });

  if (!state) return rejected("No decoder state.");
  if (
    state.status !== DECODER_STATES.PUZZLE_ACTIVE &&
    state.status !== DECODER_STATES.RETRY_AVAILABLE
  ) {
    return rejected("Hints are not available right now.");
  }

  const puzzle = state.puzzles[state.currentIndex];
  if (!puzzle) return rejected("No puzzle is available.");

  const hints = Array.isArray(puzzle.hints) ? puzzle.hints : [];
  if (state.hintsUsed >= hints.length) {
    return rejected("No more hints are available for this puzzle.");
  }

  const hint = hints[state.hintsUsed];
  const hintsUsed = state.hintsUsed + 1;

  return {
    state: {
      ...state,
      hintsUsed,
      hintsRevealed: [...state.hintsRevealed, hint],
      status: DECODER_STATES.PUZZLE_ACTIVE,
    },
    result: {
      revealed: true,
      hint,
      hintsUsed,
      hintsRemaining: hints.length - hintsUsed,
      pointsAvailable: getDecoderPoints(puzzle.points, hintsUsed),
    },
  };
}

/**
 * Snapshot for the UI. Contains no answer key.
 * @param {DecoderState} state
 */
export function getDecoderState(state) {
  if (!state) return null;
  const puzzle = state.puzzles[state.currentIndex] || null;
  const total = state.puzzles.length;
  const solved = state.history.filter((entry) => entry.solved).length;
  const maxAttempts =
    puzzle && typeof puzzle.maxAttempts === "number" && puzzle.maxAttempts > 0
      ? puzzle.maxAttempts
      : DEFAULT_MAX_ATTEMPTS;

  return {
    status: state.status,
    puzzle: puzzle ? getCurrentPuzzle(state) : null,
    puzzleNumber: total === 0 ? 0 : state.currentIndex + 1,
    totalPuzzles: total,
    attempts: state.attempts,
    maxAttempts,
    attemptsRemaining: Math.max(0, maxAttempts - state.attempts),
    hintsUsed: state.hintsUsed,
    hintsRevealed: [...state.hintsRevealed],
    totalHints: puzzle && Array.isArray(puzzle.hints) ? puzzle.hints.length : 0,
    pointsAvailable: puzzle ? getDecoderPoints(puzzle.points, state.hintsUsed) : 0,
    input: state.input,
    score: state.score,
    solvedCount: solved,
    playedCount: state.history.length,
    hasNextPuzzle: hasNextPuzzle(state),
    runComplete: state.runComplete,
    history: [...state.history],
    startedAt: state.startedAt,
    completedAt: state.completedAt,
  };
}

/**
 * Close the current puzzle and load the next one, or finish the run.
 *
 * @param {DecoderState} state
 * @param {() => Date} [now]
 */
export function completePuzzle(state, now = () => new Date()) {
  if (!state) return { state, result: { advanced: false, reason: "No decoder state." } };

  const transitionable =
    state.status === DECODER_STATES.COMPLETED ||
    state.status === DECODER_STATES.NEXT_PUZZLE;

  if (!transitionable) {
    return {
      state,
      result: { advanced: false, reason: "Solve or exhaust the current puzzle first." },
    };
  }

  if (!hasNextPuzzle(state)) {
    return {
      state: { ...state, status: DECODER_STATES.COMPLETED, runComplete: true },
      result: { advanced: false, runComplete: true },
    };
  }

  const nextIndex = state.currentIndex + 1;
  return {
    state: {
      ...state,
      currentIndex: nextIndex,
      status: DECODER_STATES.PUZZLE_ACTIVE,
      attempts: 0,
      hintsUsed: 0,
      hintsRevealed: [],
      input: "",
      puzzleStartedAt: now().toISOString(),
      runComplete: false,
    },
    result: { advanced: true, currentIndex: nextIndex },
  };
}

/** Alias used by the UI: advance to the next puzzle. */
export const nextPuzzle = completePuzzle;

/**
 * Discard the run and start fresh with the same puzzle bank and settings.
 * @param {DecoderState} state
 * @param {Object} [options]
 */
export function resetDecoder(state, options = {}) {
  if (!state) throw new Error("resetDecoder requires an existing decoder state.");
  return initializeDecoder({
    puzzles: state.pool || state.puzzles,
    puzzleCount: state.puzzles.length,
    ...options,
  });
}

/* ------------------------------------------------------------------------- *
 * Decoding helpers
 * ------------------------------------------------------------------------- */

/**
 * Apply a Caesar shift. Positive shifts decode, negative shifts encode.
 * Non-letters pass through unchanged.
 * @param {string} text
 * @param {number} shift
 */
export function caesarShift(text, shift) {
  const amount = ((Math.floor(Number(shift) || 0) % 26) + 26) % 26;
  return String(text).replace(/[a-z]/gi, (char) => {
    const base = char === char.toUpperCase() ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + amount) % 26) + base);
  });
}

/**
 * Decode "5-1-7-12-5" into letters. Separators may be hyphens or spaces.
 * @param {string} text
 */
export function numbersToLetters(text) {
  return String(text)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((value) => {
      const index = Number(value);
      if (!Number.isFinite(index) || index < 1 || index > 26) return "?";
      return String.fromCharCode(64 + index);
    })
    .join("");
}

/**
 * Decode a keyword substitution cipher.
 * @param {string} text
 * @param {string} cipherAlphabet - 26 unique uppercase letters
 */
export function substitutionDecode(text, cipherAlphabet) {
  const key = String(cipherAlphabet || "").toUpperCase();
  if (!/^[A-Z]{26}$/.test(key) || new Set(key).size !== 26) {
    throw new Error("cipherAlphabet must contain 26 unique letters.");
  }
  return String(text)
    .toUpperCase()
    .replace(/[A-Z]/g, (char) => {
      const index = key.indexOf(char);
      return index === -1 ? char : String.fromCharCode(65 + index);
    });
}

/**
 * Decode a puzzle with the helper that matches its type.
 * Returns null for types that cannot be mechanically decoded
 * (for example an artifact identification riddle).
 *
 * @param {Object} puzzle
 * @returns {string|null}
 */
export function decodePuzzle(puzzle) {
  if (!puzzle) return null;
  switch (puzzle.type) {
    case "caesar_cipher":
      return caesarShift(puzzle.encodedMessage, -(puzzle.shift || 3)).toUpperCase();
    case "number_to_letter":
      return numbersToLetters(puzzle.encodedMessage).toUpperCase();
    case "letter_substitution":
      return substitutionDecode(puzzle.encodedMessage, puzzle.cipherAlphabet).toUpperCase();
    default:
      return null;
  }
}

/**
 * True when the player's input equals the puzzle's stored answer.
 * @param {Object} puzzle
 * @param {string} input
 */
export function checkDecoderAnswer(puzzle, input) {
  if (!puzzle) return false;
  const normalizedInput = normalizeAnswer(input);
  const accepted = [puzzle.correctAnswer, ...(puzzle.acceptedAnswers || [])].map(
    normalizeAnswer,
  );
  return normalizedInput.length > 0 && accepted.includes(normalizedInput);
}
