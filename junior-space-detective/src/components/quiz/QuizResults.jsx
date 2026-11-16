import { DIFFICULTY_LABELS } from "../../utils/constants.js";

/**
 * End-of-quiz summary with a per-difficulty breakdown.
 */
export function QuizResults({ results, onRestart, onProfile, onHome }) {
  const {
    score = 0,
    totalQuestions = 0,
    correctAnswers = 0,
    incorrectAnswers = 0,
    accuracy = 0,
    difficultyBreakdown = {},
  } = results || {};

  const message =
    accuracy === 100
      ? "Perfect mission. Every answer was correct."
      : accuracy >= 80
        ? "Excellent detective work — that is badge-level accuracy."
        : accuracy >= 50
          ? "Good progress. Revisit the artifacts you found tricky."
          : "Keep exploring — every artifact you read makes the next quiz easier.";

  return (
    <section className="card quiz-shell" aria-labelledby="results-heading">
      <p className="eyebrow">Debrief</p>
      <h2 id="results-heading">Quiz complete</h2>
      <p className="lede">{message}</p>

      <div className="grid grid-4 mt-2">
        <div className="stat-card">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Points scored</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {correctAnswers}/{totalQuestions}
          </div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{incorrectAnswers}</div>
          <div className="stat-label">Incorrect</div>
        </div>
      </div>

      <h3 className="mt-3">By difficulty</h3>
      {Object.keys(difficultyBreakdown).length === 0 ? (
        <p className="muted">No answers were recorded.</p>
      ) : (
        <div className="grid grid-3">
          {Object.entries(difficultyBreakdown).map(([difficulty, entry]) => (
            <div className="stat-card" key={difficulty}>
              <div className="stat-value">
                {entry.correct}/{entry.total}
              </div>
              <div className="stat-label">
                {DIFFICULTY_LABELS[difficulty] || difficulty}
              </div>
              <div className="dim">{entry.points} points earned</div>
            </div>
          ))}
        </div>
      )}

      <div className="row mt-3">
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          Run another quiz
        </button>
        <button type="button" className="btn" onClick={onProfile}>
          View explorer profile
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          Mission Control
        </button>
      </div>
    </section>
  );
}

export default QuizResults;
