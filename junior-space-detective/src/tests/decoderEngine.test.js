import { describe, expect, it } from "vitest";
import {
  caesarShift,
  checkDecoderAnswer,
  completePuzzle,
  decodePuzzle,
  getCurrentPuzzle,
  getDecoderState,
  hasNextPuzzle,
  initializeDecoder,
  numbersToLetters,
  requestHint,
  resetDecoder,
  startPuzzle,
  submitDecoderAnswer,
  substitutionDecode,
} from "../engines/decoderEngine.js";
import { DECODER_STATES } from "../utils/constants.js";
import puzzlesData from "../data/decoderPuzzles.json";

const PUZZLES = [
  {
    id: "p1",
    title: "First signal",
    artifactId: "a1",
    difficulty: "beginner",
    type: "caesar_cipher",
    shift: 3,
    encodedMessage: "ZDWHU",
    correctAnswer: "WATER",
    acceptedAnswers: ["water"],
    hints: ["hint one", "hint two", "hint three"],
    explanation: "Because water.",
    points: 20,
    maxAttempts: 3,
    isSimulated: true,
  },
  {
    id: "p2",
    title: "Second signal",
    artifactId: "a2",
    difficulty: "intermediate",
    type: "number_to_letter",
    encodedMessage: "13-1-18-19",
    correctAnswer: "MARS",
    acceptedAnswers: ["mars"],
    hints: ["hint one"],
    explanation: "Because Mars.",
    points: 30,
    maxAttempts: 2,
    isSimulated: true,
  },
];

const now = () => new Date("2026-02-01T00:00:00Z");
// 0.999 keeps Fisher-Yates from swapping so tests can reason about order.
const rng = () => 0.999;

function activeRun(count = 2) {
  const prepared = initializeDecoder({ puzzles: PUZZLES, puzzleCount: count, rng });
  return startPuzzle(prepared, now).state;
}

describe("decoding helpers", () => {
  it("decodes Caesar shifts in both directions", () => {
    expect(caesarShift("ZDWHU", -3)).toBe("WATER");
    expect(caesarShift("WATER", 3)).toBe("ZDWHU");
    expect(caesarShift("wiki", 0)).toBe("wiki");
  });

  it("converts numbers to letters", () => {
    expect(numbersToLetters("13-1-18-19")).toBe("MARS");
    expect(numbersToLetters("5 1 7 12 5")).toBe("EAGLE");
    expect(numbersToLetters("99")).toBe("?");
  });

  it("decodes keyword substitution ciphers", () => {
    expect(substitutionDecode("LSBE", "SPACEFLIGHTBDJKMNOQRUVWXYZ")).toBe("GALE");
    expect(() => substitutionDecode("X", "TOOSHORT")).toThrow();
  });

  it("decodes every mechanical puzzle in the dataset to its stored answer", () => {
    for (const puzzle of puzzlesData.puzzles) {
      const decoded = decodePuzzle(puzzle);
      if (decoded === null) continue;
      expect(decoded).toBe(puzzle.correctAnswer);
      expect(checkDecoderAnswer(puzzle, decoded)).toBe(true);
    }
  });

  it("returns null for types that are not mechanical ciphers", () => {
    expect(decodePuzzle({ type: "artifact_identification", encodedMessage: "x" })).toBeNull();
  });
});

describe("initializeDecoder and startPuzzle", () => {
  it("starts idle with a prepared queue", () => {
    const state = initializeDecoder({ puzzles: PUZZLES, puzzleCount: 2, rng });
    expect(state.status).toBe(DECODER_STATES.IDLE);
    expect(state.puzzles).toHaveLength(2);
    expect(state.score).toBe(0);
  });

  it("activates the first puzzle and resets counters", () => {
    const state = activeRun();
    expect(state.status).toBe(DECODER_STATES.PUZZLE_ACTIVE);
    expect(state.attempts).toBe(0);
    expect(state.hintsUsed).toBe(0);
    expect(state.startedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("does not expose the answer in the current puzzle payload", () => {
    const state = activeRun();
    const puzzle = getCurrentPuzzle(state);
    expect(puzzle).not.toHaveProperty("correctAnswer");
    expect(puzzle).not.toHaveProperty("acceptedAnswers");
    expect(puzzle.encodedMessage).toBe("ZDWHU");
  });

  it("refuses to restart an active puzzle", () => {
    const state = activeRun();
    const { result } = startPuzzle(state);
    expect(result.started).toBe(false);
  });

  it("filters by difficulty", () => {
    const state = initializeDecoder({
      puzzles: PUZZLES,
      difficulties: ["intermediate"],
      rng,
    });
    expect(state.puzzles.every((puzzle) => puzzle.difficulty === "intermediate")).toBe(
      true,
    );
  });
});

describe("submitDecoderAnswer", () => {
  it("completes the puzzle on a correct answer and awards points", () => {
    const state = activeRun();
    const { state: next, result } = submitDecoderAnswer(state, "water", now);

    expect(result.accepted).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.pointsEarned).toBe(20);
    expect(next.status).toBe(DECODER_STATES.COMPLETED);
    expect(next.score).toBe(20);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].solved).toBe(true);
    expect(next.completedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("accepts answers case-insensitively and with padding", () => {
    const { result } = submitDecoderAnswer(activeRun(), "  WaTeR  ", now);
    expect(result.correct).toBe(true);
  });

  it("moves to retry on a wrong answer", () => {
    const { state: next, result } = submitDecoderAnswer(activeRun(), "fire", now);
    expect(result.correct).toBe(false);
    expect(result.attemptsRemaining).toBe(2);
    expect(next.status).toBe(DECODER_STATES.RETRY_AVAILABLE);
    expect(next.attempts).toBe(1);
    expect(next.score).toBe(0);
  });

  it("rejects empty or invalid input without spending an attempt", () => {
    const state = activeRun();
    const empty = submitDecoderAnswer(state, "   ", now);
    expect(empty.result.accepted).toBe(false);
    expect(empty.state.attempts).toBe(0);

    const tooLong = submitDecoderAnswer(state, "x".repeat(200), now);
    expect(tooLong.result.accepted).toBe(false);
  });

  it("exhausts attempts and reveals the answer", () => {
    let state = activeRun();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      state = submitDecoderAnswer(state, "wrong", now).state;
    }
    expect(state.status).toBe(DECODER_STATES.NEXT_PUZZLE);
    expect(state.attempts).toBe(3);
    expect(state.history[0].solved).toBe(false);
    expect(state.score).toBe(0);
  });

  it("refuses further submissions once completed", () => {
    const completed = submitDecoderAnswer(activeRun(), "water", now).state;
    const { result, state } = submitDecoderAnswer(completed, "water", now);
    expect(result.accepted).toBe(false);
    expect(state).toBe(completed);
  });
});

describe("requestHint", () => {
  it("reveals hints progressively and stops at the last hint", () => {
    let state = activeRun();
    const first = requestHint(state);
    state = first.state;
    expect(first.result.revealed).toBe(true);
    expect(first.result.hint).toBe("hint one");
    expect(first.result.hintsRemaining).toBe(2);
    expect(state.hintsUsed).toBe(1);

    state = requestHint(state).state;
    state = requestHint(state).state;
    expect(state.hintsUsed).toBe(3);

    const extra = requestHint(state);
    expect(extra.result.revealed).toBe(false);
    expect(extra.state.hintsUsed).toBe(3);
  });

  it("reduces the available score", () => {
    let state = activeRun();
    expect(getDecoderState(state).pointsAvailable).toBe(20);
    state = requestHint(state).state;
    expect(getDecoderState(state).pointsAvailable).toBe(15);
    const { result } = submitDecoderAnswer(state, "water", now);
    expect(result.pointsEarned).toBe(15);
  });

  it("is unavailable after completion", () => {
    const completed = submitDecoderAnswer(activeRun(), "water", now).state;
    const { result } = requestHint(completed);
    expect(result.revealed).toBe(false);
  });
});

describe("progression", () => {
  it("advances to the next active puzzle and finishes the run", () => {
    let state = submitDecoderAnswer(activeRun(), "water", now).state;
    expect(hasNextPuzzle(state)).toBe(true);

    const advanced = completePuzzle(state, now);
    expect(advanced.result.advanced).toBe(true);
    expect(advanced.state.status).toBe(DECODER_STATES.PUZZLE_ACTIVE);
    expect(advanced.state.currentIndex).toBe(1);
    expect(advanced.state.attempts).toBe(0);

    state = submitDecoderAnswer(advanced.state, "mars", now).state;
    expect(state.score).toBe(20 + 30);
    expect(hasNextPuzzle(state)).toBe(false);

    const finished = completePuzzle(state, now);
    expect(finished.result.runComplete).toBe(true);
    expect(finished.state.runComplete).toBe(true);
  });

  it("will not advance before the puzzle is solved or exhausted", () => {
    const { result } = completePuzzle(activeRun(), now);
    expect(result.advanced).toBe(false);
  });

  it("resets to a fresh run of the same length", () => {
    let state = submitDecoderAnswer(activeRun(), "water", now).state;
    state = resetDecoder(state);
    expect(state.status).toBe(DECODER_STATES.IDLE);
    expect(state.score).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.puzzles).toHaveLength(2);
  });
});
