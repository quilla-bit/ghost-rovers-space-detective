import { useCallback, useState } from "react";
import PuzzlePanel from "../components/decoder/PuzzlePanel.jsx";
import { useDecoder } from "../hooks/useDecoder.js";
import { getAllPuzzles, getArtifactById } from "../services/artifactService.js";

/**
 * Decoder page: briefing, puzzle run and archive summary.
 * Messages are explicitly labelled as simulated throughout.
 */
export function DecoderGame({ onPuzzleResult, onNavigate }) {
  const [puzzleCount, setPuzzleCount] = useState(3);

  const handlePuzzleResult = useCallback(
    (payload) => {
      if (typeof onPuzzleResult === "function") onPuzzleResult(payload);
    },
    [onPuzzleResult],
  );

  const decoder = useDecoder({ onPuzzleResult: handlePuzzleResult });

  if (!decoder.snapshot) {
    return (
      <div className="quiz-shell">
        <p className="eyebrow">Decoder station</p>
        <h1>Recover the transmission</h1>
        <p className="lede">
          Decode simulated messages using Caesar ciphers, letter substitutions,
          number-to-letter codes and artifact clues. Hints are available, but each hint
          reduces the points a puzzle is worth.
        </p>

        <section className="card mt-2" aria-labelledby="decoder-briefing-heading">
          <h2 id="decoder-briefing-heading">Briefing</h2>

          <p className="notice">
            <strong>These messages are fictional.</strong> Every encoded message in this
            game was written as an educational puzzle. None of them are authentic NASA
            transmissions or historical mission data.
          </p>

          <ul className="fact-list">
            <li>Caesar cipher: letters shift by a fixed number of places.</li>
            <li>Letter substitution: a key alphabet replaces each letter.</li>
            <li>Number-to-letter: 1 = A, 2 = B … 26 = Z.</li>
            <li>Artifact identification: read the clues and name the hardware.</li>
          </ul>

          <div className="field mt-2" style={{ maxWidth: 220 }}>
            <label htmlFor="puzzle-count">Puzzles in this run</label>
            <select
              id="puzzle-count"
              value={puzzleCount}
              onChange={(event) => setPuzzleCount(Number(event.target.value))}
            >
              {[1, 3, 5].map((count) => (
                <option key={count} value={count}>
                  {count} puzzle{count === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>

          <p className="dim mt-2">
            {getAllPuzzles().length} puzzles are available in the archive.
          </p>

          {decoder.error ? (
            <p className="notice" role="alert">
              {decoder.error}
            </p>
          ) : null}

          <div className="row mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => decoder.startRun({ puzzleCount })}
            >
              Start decoding
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onNavigate("explorer")}
            >
              Read the artifact files
            </button>
          </div>
        </section>
      </div>
    );
  }

  const artifactName = decoder.snapshot.puzzle
    ? getArtifactById(decoder.snapshot.puzzle.artifactId)?.name
    : null;

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Decoder station</p>
          <h1>Signal recovery</h1>
        </div>
        <span className="pill">
          Score <strong>{decoder.snapshot.score}</strong>
        </span>
      </div>

      <PuzzlePanel
        snapshot={decoder.snapshot}
        feedback={decoder.feedback}
        error={decoder.error}
        artifactName={artifactName}
        onHint={decoder.requestHint}
        onSubmit={decoder.submitAnswer}
        onNext={decoder.nextPuzzle}
        onRestart={() => decoder.resetDecoder()}
        onExit={decoder.clearDecoder}
      />
    </>
  );
}

export default DecoderGame;
