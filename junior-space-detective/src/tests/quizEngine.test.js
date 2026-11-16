import { describe, expect, it } from "vitest";
import {
  createQuizSession,
  getCurrentQuestion,
  getQuizProgress,
  getQuizResults,
  isQuizComplete,
  resetQuiz,
  submitAnswer,
  toPublicQuestion,
} from "../engines/quizEngine.js";
import { createSeededRandom } from "../utils/randomization.js";
import { getAnswerPoints } from "../utils/scoring.js";

const QUESTIONS = [
  {
    id: "q1",
    artifactId: "a1",
    question: "Which planet?",
    type: "multiple_choice",
    difficulty: "beginner",
    options: ["Mars", "Venus", "Jupiter"],
    correctAnswer: "Mars",
    explanation: "Mars is correct.",
    points: 10,
  },
  {
    id: "q2",
    artifactId: "a2",
    question: "Which rover?",
    type: "artifact_identification",
    difficulty: "intermediate",
    options: ["Sojourner", "Spirit", "Curiosity"],
    correctAnswer: "Sojourner",
    explanation: "Sojourner was first.",
    points: 20,
  },
  {
    id: "q3",
    artifactId: "a3",
    question: "Interstellar probes?",
    type: "true_false",
    difficulty: "advanced",
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "Voyager reached interstellar space.",
    points: 30,
  },
];

// 0.999 keeps Fisher-Yates from swapping, so these tests can reason about order.
const rng = () => 0.999;

function freshSession(overrides = {}) {
  return createQuizSession({
    questions: QUESTIONS,
    questionCount: 3,
    rng,
    now: () => new Date("2026-01-01T00:00:00Z"),
    sessionId: "test-session",
    ...overrides,
  });
}

describe("createQuizSession", () => {
  it("selects the requested number of unique questions", () => {
    const session = freshSession({ questionCount: 2 });
    expect(session.questions).toHaveLength(2);
    const ids = session.questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never selects more questions than the bank holds", () => {
    const session = freshSession({ questionCount: 50 });
    expect(session.questions.length).toBeLessThanOrEqual(QUESTIONS.length);
  });

  it("filters by difficulty", () => {
    const session = freshSession({ difficulties: ["advanced"], questionCount: 5 });
    expect(session.questions.every((question) => question.difficulty === "advanced")).toBe(
      true,
    );
  });

  it("rejects an empty bank and empty difficulty matches", () => {
    expect(() => createQuizSession({ questions: [] })).toThrow();
    expect(() =>
      createQuizSession({ questions: QUESTIONS, difficulties: ["nonexistent"] }),
    ).toThrow(/difficulty/i);
  });

  it("removes duplicate question ids from the pool", () => {
    const session = createQuizSession({
      questions: [...QUESTIONS, { ...QUESTIONS[0] }],
      questionCount: 10,
      rng,
    });
    const ids = session.questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts active on the first question", () => {
    const session = freshSession();
    expect(session.status).toBe("active");
    expect(session.currentIndex).toBe(0);
    expect(session.score).toBe(0);
    expect(getQuizProgress(session)).toMatchObject({ answered: 0, total: 3 });
  });

  it("strips correct answers from the player-facing question", () => {
    const session = freshSession();
    const current = getCurrentQuestion(session);
    expect(current).not.toBeNull();
    expect(current).not.toHaveProperty("correctAnswer");
    expect(toPublicQuestion(session.questions[0])).not.toHaveProperty("correctAnswer");
  });
});

describe("submitAnswer", () => {
  it("awards beginner points for a correct answer and advances", () => {
    let session = freshSession();
    const current = getCurrentQuestion(session);
    const { session: next, result } = submitAnswer(session, "Mars");

    expect(result.accepted).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.pointsEarned).toBe(10);
    expect(next.score).toBe(10);
    expect(next.currentIndex).toBe(1);
    expect(next.answers).toHaveLength(1);
    expect(session.score).toBe(0); // original untouched
  });

  it("scores zero for an incorrect answer but still advances", () => {
    const session = freshSession();
    const { session: next, result } = submitAnswer(session, "Venus");
    expect(result.correct).toBe(false);
    expect(result.pointsEarned).toBe(0);
    expect(next.score).toBe(0);
    expect(next.currentIndex).toBe(1);
    expect(next.answers[0].correct).toBe(false);
  });

  it("normalises case and whitespace", () => {
    const session = freshSession();
    const { result } = submitAnswer(session, "  mArS  ");
    expect(result.correct).toBe(true);
  });

  it("rejects empty submissions without changing state", () => {
    const session = freshSession();
    const { session: next, result } = submitAnswer(session, "   ");
    expect(result.accepted).toBe(false);
    expect(next).toBe(session);
  });

  it("rejects answers that are not options", () => {
    const session = freshSession();
    const { result } = submitAnswer(session, "Saturn");
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/available answers/i);
  });

  it("rejects duplicate submissions for the same question", () => {
    const session = freshSession();
    const first = submitAnswer(session, "Mars");
    const second = submitAnswer(first.session, "Mars", {
      questionId: first.session.questions[0].id,
    });
    expect(second.result.accepted).toBe(false);
    expect(second.session).toBe(first.session);
    expect(second.session.answers).toHaveLength(1);
  });

  it("applies hint penalties through the central scoring rules", () => {
    const session = freshSession();
    expect(getAnswerPoints("beginner", 1)).toBe(5);
    const { result } = submitAnswer(session, "Mars", { hintsUsed: 1 });
    expect(result.pointsEarned).toBe(5);
  });

  it("completes after the final question", () => {
    let session = freshSession();
    session = submitAnswer(session, "Mars").session;
    session = submitAnswer(session, "Sojourner").session;
    const final = submitAnswer(session, "True");

    expect(final.result.isLastQuestion).toBe(true);
    expect(isQuizComplete(final.session)).toBe(true);
    expect(getCurrentQuestion(final.session)).toBeNull();
    expect(final.session.score).toBe(10 + 20 + 30);
  });

  it("refuses submissions after completion", () => {
    let session = freshSession({ questionCount: 1 });
    session = submitAnswer(session, "Mars").session;
    const { result } = submitAnswer(session, "Mars");
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/already complete/i);
  });
});

describe("getQuizResults", () => {
  it("reports accuracy, counts and difficulty breakdown", () => {
    const clock = { now: () => new Date("2026-01-01T00:00:00Z") };
    let session = freshSession();
    session = submitAnswer(session, "Mars", clock).session;
    session = submitAnswer(session, "Spirit", clock).session;
    session = submitAnswer(session, "True", clock).session;

    const results = getQuizResults(session);
    expect(results.totalQuestions).toBe(3);
    expect(results.correctAnswers).toBe(2);
    expect(results.incorrectAnswers).toBe(1);
    expect(results.accuracy).toBe(67);
    expect(results.score).toBe(10 + 30);
    expect(results.difficultyBreakdown).toHaveProperty("beginner");
    expect(results.difficultyBreakdown.beginner.correct).toBe(1);
    expect(results.completedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles an unanswered session without dividing by zero", () => {
    const results = getQuizResults(freshSession());
    expect(results.accuracy).toBe(0);
    expect(results.answered).toBe(0);
  });
});

describe("resetQuiz", () => {
  it("creates a new active session with the same configuration", () => {
    let session = freshSession({ questionCount: 2 });
    session = submitAnswer(session, "Mars").session;
    const restarted = resetQuiz(session, { rng, now: () => new Date() });

    expect(restarted.status).toBe("active");
    expect(restarted.answers).toEqual([]);
    expect(restarted.score).toBe(0);
    expect(restarted.questions).toHaveLength(2);
    expect(restarted.id).not.toBe(session.id);
  });
});

describe("randomisation", () => {
  it("can produce different question orders with different seeds", () => {
    const orders = new Set();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const session = createQuizSession({
        questions: QUESTIONS,
        questionCount: 3,
        rng: createSeededRandom(seed),
      });
      orders.add(session.questions.map((q) => q.id).join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});
