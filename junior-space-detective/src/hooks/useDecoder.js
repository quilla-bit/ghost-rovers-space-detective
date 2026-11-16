import { useCallback, useMemo, useRef, useState } from "react";
import {
  completePuzzle as advancePuzzle,
  getDecoderState,
  initializeDecoder,
  requestHint as requestPuzzleHint,
  startPuzzle as activatePuzzle,
  submitDecoderAnswer,
} from "../engines/decoderEngine.js";
import { DEFAULT_PUZZLE_COUNT } from "../utils/constants.js";
import { getAllPuzzles } from "../services/artifactService.js";

/**
 * React binding for the decoder state machine.
 *
 * @param {Object} [options]
 * @param {Array<Object>} [options.puzzles] - puzzle bank (defaults to dataset)
 * @param {number} [options.puzzleCount]
 * @param {(payload: Object) => void} [options.onPuzzleResult] - called once per solve/exhaustion
 */
export function useDecoder({
  puzzles,
  puzzleCount = DEFAULT_PUZZLE_COUNT,
  onPuzzleResult,
} = {}) {
  const bank = useMemo(
    () => (Array.isArray(puzzles) && puzzles.length > 0 ? puzzles : getAllPuzzles()),
    [puzzles],
  );

  const [state, setState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const recordedRef = useRef(new Set());
  const onResultRef = useRef(onPuzzleResult);
  onResultRef.current = onPuzzleResult;

  const initialize = useCallback(
    (options = {}) => {
      try {
        const prepared = initializeDecoder({
          puzzles: bank,
          puzzleCount: options.puzzleCount ?? puzzleCount,
          difficulties: options.difficulties ?? null,
          rng: options.rng,
        });
        setState(prepared);
        setFeedback(null);
        setError(null);
        return prepared;
      } catch (caught) {
        setError(caught.message || "Could not prepare the decoder.");
        return null;
      }
    },
    [bank, puzzleCount],
  );

  /**
   * Prepare a fresh run and immediately activate the first puzzle.
   * Used by the "Start decoding" button so the player never has to press twice.
   */
  const startRun = useCallback(
    (options = {}) => {
      try {
        const prepared = initializeDecoder({
          puzzles: bank,
          puzzleCount: options.puzzleCount ?? puzzleCount,
          difficulties: options.difficulties ?? null,
          rng: options.rng,
        });
        const { state: active } = activatePuzzle(prepared);
        setState(active);
        setFeedback(null);
        setError(null);
        recordedRef.current = new Set();
        return active;
      } catch (caught) {
        setError(caught.message || "Could not start the decoder.");
        return null;
      }
    },
    [bank, puzzleCount],
  );

  const startPuzzle = useCallback(() => {
    setState((current) => {
      if (!current) return current;
      const { state: nextState } = activatePuzzle(current);
      return nextState;
    });
    setFeedback(null);
    setError(null);
  }, []);

  const recordResult = useCallback((puzzleState, result) => {
    if (!result?.accepted) return;
    if (!(result.correct || result.exceededAttempts)) return;
    const puzzle = puzzleState.puzzles[puzzleState.currentIndex];
    if (!puzzle) return;

    const key = `${puzzle.id}:${result.correct ? "solved" : "failed"}:${puzzleState.history.length}`;
    if (recordedRef.current.has(key)) return;
    recordedRef.current.add(key);

    if (typeof onResultRef.current === "function") {
      onResultRef.current({
        puzzleId: puzzle.id,
        artifactId: puzzle.artifactId,
        difficulty: puzzle.difficulty,
        solved: result.correct,
        attempts: result.attempts,
        hintsUsed: puzzleState.hintsUsed,
        score: result.pointsEarned || 0,
        completedAt: puzzleState.completedAt,
      });
    }
  }, []);

  const submitAnswer = useCallback(
    (input) => {
      if (!state) {
        setError("Start a puzzle first.");
        return null;
      }
      const { state: nextState, result } = submitDecoderAnswer(state, input);

      if (!result.accepted) {
        setError(result.reason || "That answer could not be submitted.");
        return null;
      }

      setError(null);
      setFeedback(result);
      setState(nextState);
      recordResult(nextState, result);
      return { state: nextState, result };
    },
    [state, recordResult],
  );

  const requestHint = useCallback(() => {
    if (!state) {
      setError("Start a puzzle first.");
      return null;
    }
    const { state: nextState, result } = requestPuzzleHint(state);
    if (!result.revealed) {
      setError(result.reason || "No hint is available.");
      return null;
    }
    setError(null);
    setState(nextState);
    return result;
  }, [state]);

  const nextPuzzle = useCallback(() => {
    if (!state) return null;
    const { state: nextState, result } = advancePuzzle(state);
    setFeedback(null);
    setError(null);
    setState(nextState);
    return result;
  }, [state]);

  /** Start a fresh run, reusing the current run length when one exists. */
  const resetDecoder = useCallback(
    () => startRun({ puzzleCount: state ? state.puzzles.length : puzzleCount }),
    [startRun, state, puzzleCount],
  );

  const clearDecoder = useCallback(() => {
    setState(null);
    setFeedback(null);
    setError(null);
  }, []);

  const snapshot = useMemo(() => (state ? getDecoderState(state) : null), [state]);

  return {
    state,
    snapshot,
    puzzle: snapshot?.puzzle || null,
    feedback,
    error,
    initialize,
    startRun,
    startPuzzle,
    submitAnswer,
    requestHint,
    nextPuzzle,
    resetDecoder,
    clearDecoder,
  };
}

export default useDecoder;
