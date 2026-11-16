import { useEffect, useState } from "react";
import { DECODER_STATES, DIFFICULTY_LABELS } from "../../utils/constants.js";

/**
 * The decoder play surface. Renders the current state-machine state:
 * an active puzzle, a solved/failed puzzle, or the run summary.
 */
export function PuzzlePanel({
  snapshot,
  feedback,
  error,
  artifactName,
  onHint,
  onSubmit,
  onNext,
  onRestart,
  onExit,
}) {
  const [value, setValue] = useState("");
  const puzzleId = snapshot?.puzzle?.id || null;
  const status = snapshot?.status;

  useEffect(() => {
    setValue("");
  }, [puzzleId, status === DECODER_STATES.PUZZLE_ACTIVE]);

  if (!snapshot) return null;

  if (snapshot.runComplete) {
    return (
      <section className="card quiz-shell" aria-labelledby="decoder-summary-heading">
        <p className="eyebrow">Signal archive complete</p>
        <h2 id="decoder-summary-heading">Decoder run finished</h2>
        <p className="lede">
          You solved {snapshot.solvedCount} of {snapshot.playedCount} puzzles in this
          run for {snapshot.score} points.
        </p>

        <div className="grid grid-3 mt-2">
          <div className="stat-card">
            <div className="stat-value">{snapshot.solvedCount}</div>
            <div className="stat-label">Puzzles solved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{snapshot.score}</div>
            <div className="stat-label">Run score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{snapshot.totalPuzzles}</div>
            <div className="stat-label">Puzzles attempted</div>
          </div>
        </div>

        <ul className="fact-list mt-3">
          {snapshot.history.map((entry) => (
            <li key={`${entry.puzzleId}-${entry.completedAt}`}>
              {entry.solved ? "Solved" : "Not solved"}: {entry.puzzleId} ·{" "}
              {entry.attempts} attempt{entry.attempts === 1 ? "" : "s"} ·{" "}
              {entry.pointsEarned} points
            </li>
          ))}
        </ul>

        <div className="row mt-3">
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            New decoder run
          </button>
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            Back to briefing
          </button>
        </div>
      </section>
    );
  }

  const puzzle = snapshot.puzzle;
  if (!puzzle) return null;

  const finished =
    status === DECODER_STATES.COMPLETED || status === DECODER_STATES.NEXT_PUZZLE;
  const solved = status === DECODER_STATES.COMPLETED;
  const canSubmit =
    (status === DECODER_STATES.PUZZLE_ACTIVE ||
      status === DECODER_STATES.RETRY_AVAILABLE) &&
    value.trim().length > 0;

  const typeLabel = {
    caesar_cipher: "Caesar cipher",
    letter_substitution: "Letter substitution",
    number_to_letter: "Number-to-letter code",
    artifact_identification: "Artifact identification",
  }[puzzle.type];

  return (
    <section className="card quiz-shell" aria-labelledby="puzzle-heading">
      <div className="quiz-meta">
        <span>
          Puzzle {snapshot.puzzleNumber} of {snapshot.totalPuzzles}
        </span>
        <span>
          {DIFFICULTY_LABELS[puzzle.difficulty] || puzzle.difficulty} · {typeLabel}
        </span>
      </div>

      <h2 id="puzzle-heading">{puzzle.title}</h2>

      <p className="notice notice-info">
        <strong>Simulated transmission.</strong> This message is a fictional puzzle
        written for the game. It is not an authentic NASA transmission.
      </p>

      {puzzle.context ? <p className="muted">{puzzle.context}</p> : null}

      <div className="encoded-message" aria-label="Encoded message">
        {puzzle.encodedMessage}
      </div>

      <div className="row spread">
        <span className="dim">
          Attempts used: {snapshot.attempts} of {snapshot.maxAttempts} · Hints used:{" "}
          {snapshot.hintsUsed} of {snapshot.totalHints}
        </span>
        <span className="chip">Worth {snapshot.pointsAvailable} pts now</span>
      </div>

      {snapshot.hintsRevealed.length > 0 ? (
        <ul className="hint-list" aria-label="Revealed hints">
          {snapshot.hintsRevealed.map((hint, index) => (
            <li key={hint}>
              <strong>Hint {index + 1}:</strong> {hint}
            </li>
          ))}
        </ul>
      ) : null}

      {finished ? (
        <div
          className={`feedback ${solved ? "is-correct" : "is-incorrect"}`}
          role="status"
        >
          <strong>{solved ? "Transmission decoded" : "Out of attempts"}</strong>
          <p>
            {feedback?.explanation || puzzle.explanation}
          </p>
          <p className="mt-1">
            Answer: <strong>{feedback?.answer || puzzle.correctAnswer}</strong>
            {solved ? ` · +${feedback?.pointsEarned ?? 0} points` : null}
          </p>
        </div>
      ) : (
        <form
          className="answer-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit(value);
          }}
        >
          <label htmlFor="decoder-answer" className="sr-only">
            Your decoded answer
          </label>
          <input
            id="decoder-answer"
            type="text"
            autoComplete="off"
            placeholder="Type the decoded message…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby={error ? "decoder-error" : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            Decode
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onHint}
            disabled={snapshot.hintsUsed >= snapshot.totalHints}
          >
            Reveal hint
          </button>
        </form>
      )}

      {error ? (
        <p id="decoder-error" className="notice mt-2" role="alert">
          {error}
        </p>
      ) : null}

      {finished ? (
        <div className="row mt-3">
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {snapshot.hasNextPuzzle ? "Next puzzle" : "Finish run"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onRestart}>
            Restart run
          </button>
        </div>
      ) : null}

      <p className="dim mt-2">
        Linked artifact: {artifactName || puzzle.artifactId} · Run score{" "}
        {snapshot.score}
      </p>
    </section>
  );
}

export default PuzzlePanel;
