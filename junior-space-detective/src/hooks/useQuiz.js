import { useCallback, useMemo, useRef, useState } from "react";
import {
  createQuizSession,
  getCurrentQuestion,
  getQuestionCount,
  getQuizProgress,
  getQuizResults,
  resetQuiz as resetQuizSession,
  submitAnswer as submitQuizAnswer,
} from "../engines/quizEngine.js";
import { DEFAULT_QUESTION_COUNT } from "../utils/constants.js";
import { getAllQuestions } from "../services/artifactService.js";

/**
 * React binding for the quiz engine.
 *
 * The hook keeps the engine session in state, exposes a small stable API and
 * calls `onComplete` exactly once per session. All scoring logic stays in the
 * engine.
 *
 * @param {Object} [options]
 * @param {Array<Object>} [options.questions] - question bank (defaults to dataset)
 * @param {number} [options.questionCount]
 * @param {(results: Object) => void} [options.onComplete]
 */
export function useQuiz({ questions, questionCount = DEFAULT_QUESTION_COUNT, onComplete } = {}) {
  const bank = useMemo(
    () => (Array.isArray(questions) && questions.length > 0 ? questions : getAllQuestions()),
    [questions],
  );

  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const completedRef = useRef(new Set());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const startQuiz = useCallback(
    (options = {}) => {
      try {
        const nextSession = createQuizSession({
          questions: bank,
          questionCount: options.questionCount ?? questionCount,
          difficulties: options.difficulties ?? null,
          rng: options.rng,
        });
        setSession(nextSession);
        setFeedback(null);
        setError(null);
        return nextSession;
      } catch (caught) {
        setError(caught.message || "Could not start the quiz.");
        return null;
      }
    },
    [bank, questionCount],
  );

  const submitAnswer = useCallback(
    (answer, options = {}) => {
      if (!session) {
        setError("Start a quiz first.");
        return null;
      }

      const { session: nextSession, result } = submitQuizAnswer(session, answer, {
        questionId: options.questionId,
        hintsUsed: options.hintsUsed || 0,
      });

      if (!result.accepted) {
        setError(result.reason || "That answer could not be submitted.");
        return null;
      }

      setError(null);
      setFeedback(result);
      setSession(nextSession);

      if (nextSession.status === "completed" && !completedRef.current.has(nextSession.id)) {
        completedRef.current.add(nextSession.id);
        const results = {
          ...getQuizResults(nextSession),
          sessionId: nextSession.id,
        };
        if (typeof onCompleteRef.current === "function") {
          onCompleteRef.current(results);
        }
      }

      return { session: nextSession, result };
    },
    [session],
  );

  const resetQuiz = useCallback(() => {
    if (!session) return;
    setSession(resetQuizSession(session));
    setFeedback(null);
    setError(null);
  }, [session]);

  const clearQuiz = useCallback(() => {
    setSession(null);
    setFeedback(null);
    setError(null);
  }, []);

  const currentQuestion = useMemo(
    () => (session ? getCurrentQuestion(session) : null),
    [session],
  );

  const results = useMemo(() => (session ? getQuizResults(session) : null), [session]);
  const progress = useMemo(() => (session ? getQuizProgress(session) : null), [session]);

  return {
    session,
    currentQuestion,
    questionNumber: session ? Math.min(session.answers.length + 1, getQuestionCount(session)) : 0,
    totalQuestions: session ? getQuestionCount(session) : 0,
    progress,
    feedback,
    results,
    error,
    isComplete: Boolean(session && session.status === "completed"),
    startQuiz,
    submitAnswer,
    resetQuiz,
    clearQuiz,
  };
}

export default useQuiz;
