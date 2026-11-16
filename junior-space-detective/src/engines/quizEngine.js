import {
  DEFAULT_QUESTION_COUNT,
  DIFFICULTIES,
  MAX_QUESTIONS_PER_QUIZ,
} from "../utils/constants.js";
import { calculateAccuracy, buildDifficultyBreakdown, getAnswerPoints } from "../utils/scoring.js";
import { normalizeAnswer } from "../utils/validation.js";
import { sample } from "../utils/randomization.js";

/**
 * Junior Space Detective quiz engine.
 *
 * Pure JavaScript: no React, no DOM, no storage. A "session" is a plain,
 * immutable object. Every function returns a new session instead of mutating
 * the one it received, which makes the engine safe for React state and easy
 * to unit test.
 *
 * Correct answers live inside the session, but `getCurrentQuestion()` strips
 * them so the player-facing UI can never read the answer before submitting.
 */

let sessionCounter = 0;

/**
 * @typedef {Object} QuizSession
 * @property {string} id
 * @property {string} status - "active" | "completed"
 * @property {Array<Object>} questions - full question records (internal)
 * @property {number} currentIndex
 * @property {Array<Object>} answers
 * @property {number} score
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 * @property {Object} config
 */

/**
 * Create a quiz session.
 *
 * @param {Object} options
 * @param {Array<Object>} options.questions - the full question bank
 * @param {number} [options.questionCount=5] - how many questions to draw
 * @param {string[]|null} [options.difficulties=null] - optional difficulty filter
 * @param {() => number} [options.rng] - injectable RNG for deterministic tests
 * @param {() => Date} [options.now] - injectable clock
 * @param {string} [options.sessionId] - explicit id (tests)
 * @returns {QuizSession}
 */
export function createQuizSession({
  questions,
  questionCount = DEFAULT_QUESTION_COUNT,
  difficulties = null,
  rng,
  now = () => new Date(),
  sessionId,
} = {}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("createQuizSession requires at least one question.");
  }

  let pool = questions.filter((question) => question && question.id);
  if (Array.isArray(difficulties) && difficulties.length > 0) {
    const allowed = new Set(difficulties);
    const filtered = pool.filter((question) => allowed.has(question.difficulty));
    if (filtered.length === 0) {
      throw new Error("No questions match the selected difficulty.");
    }
    pool = filtered;
  }

  // De-duplicate by id so a malformed source cannot repeat a question.
  const seen = new Set();
  pool = pool.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });

  const requested = Number.isFinite(Number(questionCount))
    ? Math.floor(Number(questionCount))
    : DEFAULT_QUESTION_COUNT;
  const count = Math.max(1, Math.min(requested, MAX_QUESTIONS_PER_QUIZ, pool.length));
  const selected = sample(pool, count, rng);

  sessionCounter += 1;
  const startedAt = now().toISOString();

  return {
    id: sessionId || `quiz-${sessionCounter}`,
    status: "active",
    questions: selected,
    currentIndex: 0,
    answers: [],
    score: 0,
    startedAt,
    completedAt: null,
    config: {
      questionCount: count,
      difficulties: Array.isArray(difficulties) ? [...difficulties] : null,
      // Retained so resetQuiz can draw a fresh set from the original bank.
      pool: questions,
    },
  };
}

/**
 * Remove the answer key from a question before it reaches the UI.
 * @param {Object} question
 */
export function toPublicQuestion(question) {
  if (!question) return null;
  const { correctAnswer, ...rest } = question;
  return rest;
}

/**
 * The question currently on screen, without its answer.
 * @param {QuizSession} session
 * @returns {Object|null}
 */
export function getCurrentQuestion(session) {
  if (!session || session.status === "completed") return null;
  return toPublicQuestion(session.questions[session.currentIndex]) || null;
}

/**
 * Number of questions in the session.
 * @param {QuizSession} session
 */
export function getQuestionCount(session) {
  return session?.questions?.length ?? 0;
}

/**
 * Whether the session has finished.
 * @param {QuizSession} session
 */
export function isQuizComplete(session) {
  return Boolean(session) && session.status === "completed";
}

/**
 * Progress through the session.
 * @param {QuizSession} session
 */
export function getQuizProgress(session) {
  const total = getQuestionCount(session);
  const answered = session?.answers?.length ?? 0;
  return {
    answered,
    total,
    remaining: Math.max(0, total - answered),
    currentIndex: session?.currentIndex ?? 0,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

/**
 * Find the matching option for a submitted answer.
 * Case and surrounding whitespace are ignored.
 * @param {Object} question
 * @param {string} input
 * @returns {string|null} the canonical option text
 */
function resolveOption(question, input) {
  const normalized = normalizeAnswer(input);
  if (!normalized) return null;
  return (
    (question.options || []).find((option) => normalizeAnswer(option) === normalized) ||
    null
  );
}

/**
 * Submit an answer for the current question.
 *
 * Duplicate submissions and invalid options are rejected without changing the
 * session, so a player cannot farm points by pressing submit repeatedly.
 *
 * @param {QuizSession} session
 * @param {string} input - the selected option text
 * @param {Object} [options]
 * @param {number} [options.hintsUsed=0] - hints revealed for this question
 * @param {string} [options.questionId] - guards against stale UI submissions
 * @param {() => Date} [options.now]
 * @returns {{session: QuizSession, result: Object}}
 */
export function submitAnswer(
  session,
  input,
  { hintsUsed = 0, questionId, now = () => new Date() } = {},
) {
  const rejected = (reason) => ({
    session,
    result: { accepted: false, reason },
  });

  if (!session) return rejected("No active quiz.");
  if (session.status === "completed") return rejected("This quiz is already complete.");

  const question = session.questions[session.currentIndex];
  if (!question) return rejected("No question is available.");
  if (questionId && questionId !== question.id) {
    return rejected("This question is no longer the active question.");
  }
  if (session.answers.some((answer) => answer.questionId === question.id)) {
    return rejected("This question has already been answered.");
  }

  if (typeof input !== "string" || input.trim() === "") {
    return rejected("Choose an answer before submitting.");
  }
  if (input.length > 200) {
    return rejected("That answer is too long.");
  }

  const selected = resolveOption(question, input);
  if (!selected) {
    return rejected("Choose one of the available answers.");
  }

  const correct = normalizeAnswer(selected) === normalizeAnswer(question.correctAnswer);
  const pointsEarned = correct ? getAnswerPoints(question.difficulty, hintsUsed) : 0;
  const answerRecord = {
    questionId: question.id,
    artifactId: question.artifactId,
    difficulty: question.difficulty,
    givenAnswer: selected,
    correctAnswer: question.correctAnswer,
    correct,
    pointsEarned,
    hintsUsed: Math.max(0, Math.floor(Number(hintsUsed) || 0)),
    answeredAt: now().toISOString(),
  };

  const answers = [...session.answers, answerRecord];
  const isLast = session.currentIndex >= session.questions.length - 1;
  const completed = isLast;

  const nextSession = {
    ...session,
    answers,
    score: session.score + pointsEarned,
    currentIndex: completed ? session.currentIndex : session.currentIndex + 1,
    status: completed ? "completed" : "active",
    completedAt: completed ? now().toISOString() : null,
  };

  return {
    session: nextSession,
    result: {
      accepted: true,
      correct,
      givenAnswer: selected,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      pointsEarned,
      isLastQuestion: completed,
      message: correct
        ? `Correct! +${pointsEarned} points`
        : `Not quite. The answer is ${question.correctAnswer}.`,
    },
  };
}

/**
 * Summary of a finished (or in-progress) session.
 * @param {QuizSession} session
 */
export function getQuizResults(session) {
  if (!session) {
    return {
      score: 0,
      totalQuestions: 0,
      answered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      accuracy: 0,
      completedAt: null,
      difficultyBreakdown: {},
      status: "idle",
    };
  }

  const correctAnswers = session.answers.filter((answer) => answer.correct).length;
  const incorrectAnswers = session.answers.length - correctAnswers;
  const totalQuestions = getQuestionCount(session);

  return {
    score: session.score,
    totalQuestions,
    answered: session.answers.length,
    correctAnswers,
    incorrectAnswers,
    accuracy: calculateAccuracy(correctAnswers, session.answers.length),
    completedAt: session.completedAt,
    startedAt: session.startedAt,
    difficultyBreakdown: buildDifficultyBreakdown(session.answers),
    status: session.status,
    isComplete: session.status === "completed" && session.answers.length === totalQuestions,
  };
}

/**
 * Start a brand new session with the same configuration.
 * @param {QuizSession} session
 * @param {Object} [options] - passed to createQuizSession (rng, now, ...)
 */
export function resetQuiz(session, options = {}) {
  if (!session) {
    throw new Error("resetQuiz requires an existing session.");
  }
  return createQuizSession({
    questions: session.config?.pool || session.questions,
    questionCount: session.config?.questionCount,
    difficulties: session.config?.difficulties,
    ...options,
  });
}

/**
 * Difficulty values accepted by the engine, re-exported for UI selectors.
 */
export const QUIZ_DIFFICULTIES = DIFFICULTIES;
