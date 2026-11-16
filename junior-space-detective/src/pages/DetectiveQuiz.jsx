import { useCallback, useState } from "react";
import QuestionCard from "../components/quiz/QuestionCard.jsx";
import QuizResults from "../components/quiz/QuizResults.jsx";
import ProgressBar from "../components/shared/ProgressBar.jsx";
import { useQuiz } from "../hooks/useQuiz.js";
import { getAllQuestions } from "../services/artifactService.js";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "../utils/constants.js";

/**
 * Quiz page: difficulty briefing, question flow and debrief.
 *
 * Answers are checked inside the engine; this page never reads the answer key
 * before submission.
 */
export function DetectiveQuiz({ onResults, onNavigate }) {
  const [difficulty, setDifficulty] = useState("all");
  const [questionCount, setQuestionCount] = useState(5);
  const [selected, setSelected] = useState(null);
  const [review, setReview] = useState(null);

  const handleComplete = useCallback(
    (results) => {
      if (typeof onResults === "function") onResults(results);
    },
    [onResults],
  );

  const quiz = useQuiz({ onComplete: handleComplete });

  function start() {
    const session = quiz.startQuiz({
      questionCount,
      difficulties: difficulty === "all" ? null : [difficulty],
    });
    if (session) {
      setSelected(null);
      setReview(null);
    }
  }

  function submit() {
    const question = quiz.currentQuestion;
    const questionNumber = quiz.questionNumber;
    if (!question) return;
    const outcome = quiz.submitAnswer(selected, { questionId: question.id });
    if (outcome?.result?.accepted) {
      setReview({ question, questionNumber, selected, feedback: outcome.result });
      setSelected(null);
    }
  }

  function advanceFromReview() {
    setReview(null);
  }

  function restart() {
    setReview(null);
    setSelected(null);
    quiz.startQuiz({
      questionCount,
      difficulties: difficulty === "all" ? null : [difficulty],
    });
  }

  if (!quiz.session) {
    return (
      <div className="quiz-shell">
        <p className="eyebrow">Junior Space Detective</p>
        <h1>Case briefing</h1>
        <p className="lede">
          Answer questions drawn from {getAllQuestions().length} mission questions
          covering artifacts in this archive. You will see feedback and an explanation
          after each submission.
        </p>

        <section className="card mt-2" aria-labelledby="setup-heading">
          <h2 id="setup-heading">Set up your quiz</h2>

          <div className="grid grid-2 mt-2">
            <div className="field">
              <label htmlFor="quiz-difficulty">Difficulty</label>
              <select
                id="quiz-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="all">Mixed difficulty</option>
                {DIFFICULTIES.map((level) => (
                  <option key={level} value={level}>
                    {DIFFICULTY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="quiz-count">Number of questions</label>
              <select
                id="quiz-count"
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
              >
                {[3, 5, 10].map((count) => (
                  <option key={count} value={count}>
                    {count} questions
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="notice mt-2">
            Points by difficulty: beginner 10, intermediate 20, advanced 30. Correct
            answers only — and each question can be answered once per session.
          </p>

          {quiz.error ? (
            <p className="notice" role="alert">
              {quiz.error}
            </p>
          ) : null}

          <div className="row mt-3">
            <button type="button" className="btn btn-primary" onClick={start}>
              Start the quiz
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onNavigate("explorer")}
            >
              Review artifacts first
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (quiz.isComplete && !review) {
    return (
      <QuizResults
        results={quiz.results}
        onRestart={restart}
        onProfile={() => onNavigate("profile")}
        onHome={() => onNavigate("home")}
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Junior Space Detective</p>
          <h1>Investigation in progress</h1>
        </div>
        <span className="pill">
          Score <strong>{quiz.results?.score ?? 0}</strong>
        </span>
      </div>

      <div className="mt-2">
        <ProgressBar
          value={quiz.progress?.answered ?? 0}
          max={quiz.progress?.total ?? 0}
          label="Questions answered"
        />
      </div>

      {review ? (
        <>
          <QuestionCard
            question={review.question}
            questionNumber={review.questionNumber}
            totalQuestions={quiz.totalQuestions}
            selected={review.selected}
            feedback={review.feedback}
            disabled
          />

          <div
            className={`feedback ${review.feedback.correct ? "is-correct" : "is-incorrect"}`}
            role="status"
          >
            <strong>
              {review.feedback.correct ? "Correct" : "Not quite"}
              {review.feedback.correct
                ? ` · +${review.feedback.pointsEarned} points`
                : ` · the answer is ${review.feedback.correctAnswer}`}
            </strong>
            <p>{review.feedback.explanation}</p>
          </div>

          <div className="row">
            <button type="button" className="btn btn-primary" onClick={advanceFromReview}>
              {review.feedback.isLastQuestion ? "See debrief" : "Next question"}
            </button>
          </div>
        </>
      ) : (
        <>
          {quiz.error ? (
            <p className="notice" role="alert">
              {quiz.error}
            </p>
          ) : null}
          <QuestionCard
            question={quiz.currentQuestion}
            questionNumber={quiz.questionNumber}
            totalQuestions={quiz.totalQuestions}
            selected={selected}
            onSelect={setSelected}
            onSubmit={submit}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-2"
            onClick={() => {
              quiz.clearQuiz();
              setSelected(null);
              setReview(null);
            }}
          >
            Abandon this quiz
          </button>
        </>
      )}
    </div>
  );
}

export default DetectiveQuiz;
