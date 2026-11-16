import { useState } from "react";
import BadgeGrid from "../components/achievements/BadgeGrid.jsx";
import StatCard from "../components/shared/StatCard.jsx";
import ProgressBar from "../components/shared/ProgressBar.jsx";
import { calculateAccuracy } from "../utils/scoring.js";
import { getDestinationCounts } from "../services/artifactService.js";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Explorer profile: lifetime statistics, achievement collection and reset.
 */
export function ExplorerProfile({
  progress,
  statistics,
  metrics,
  badgeProgress,
  onReset,
  onNavigate,
}) {
  const [tab, setTab] = useState("all");
  const [confirmingReset, setConfirmingReset] = useState(false);

  const accuracy = calculateAccuracy(
    statistics.correctAnswers,
    statistics.questionsAnswered,
  );
  const unlocked = badgeProgress.filter((badge) => badge.unlocked);
  const locked = badgeProgress.filter((badge) => !badge.unlocked);
  const destinationCounts = getDestinationCounts();
  const visible = tab === "unlocked" ? unlocked : tab === "locked" ? locked : badgeProgress;

  return (
    <>
      <div className="profile-head">
        <div className="identity">
          <span className="identity-mark" aria-hidden="true">
            🧑‍🚀
          </span>
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.15rem" }}>
              Explorer profile
            </p>
            <h1 style={{ margin: 0 }}>Junior Space Detective</h1>
            <p className="dim" style={{ margin: 0 }}>
              Local player · created {formatDate(progress.player.createdAt)} · last
              played {formatDate(progress.player.lastPlayed)}
            </p>
          </div>
        </div>
        <div className="row">
          <span className="pill">
            <span aria-hidden="true">⭐</span> <strong>{statistics.totalScore}</strong>{" "}
            points
          </span>
          <span className="pill">
            <span aria-hidden="true">🎖️</span> <strong>{unlocked.length}</strong>/
            {badgeProgress.length} badges
          </span>
        </div>
      </div>

      <section className="section" aria-labelledby="career-heading">
        <div className="section-head">
          <h2 id="career-heading">Mission statistics</h2>
        </div>
        <div className="grid grid-4">
          <StatCard label="Total points" value={statistics.totalScore} />
          <StatCard label="Quizzes completed" value={statistics.quizzesCompleted} />
          <StatCard
            label="Decoder puzzles solved"
            value={statistics.decoderPuzzlesCompleted}
          />
          <StatCard label="Artifacts explored" value={metrics.artifactsExplored} />
          <StatCard
            label="Questions answered"
            value={statistics.questionsAnswered}
          />
          <StatCard
            label="Accuracy"
            value={statistics.questionsAnswered > 0 ? `${accuracy}%` : "—"}
            hint={`${statistics.correctAnswers} correct · ${statistics.incorrectAnswers} incorrect`}
          />
          <StatCard label="Best quiz accuracy" value={`${metrics.bestQuizAccuracy}%`} />
          <StatCard label="Perfect quizzes" value={metrics.perfectQuizzes} />
        </div>
      </section>

      <section className="section" aria-labelledby="exploration-heading">
        <div className="section-head">
          <h2 id="exploration-heading">Exploration by destination</h2>
        </div>
        <div className="card">
          <div className="grid grid-3">
            <div>
              <ProgressBar
                value={metrics.moonArtifactsExplored}
                max={destinationCounts.Moon || 1}
                label="Moon artifacts"
              />
            </div>
            <div>
              <ProgressBar
                value={metrics.marsArtifactsExplored}
                max={destinationCounts.Mars || 1}
                label="Mars artifacts"
              />
            </div>
            <div>
              <ProgressBar
                value={metrics.deepSpaceArtifactsExplored}
                max={destinationCounts["Deep Space"] || 1}
                label="Deep space artifacts"
              />
            </div>
          </div>
          <p className="dim mt-2" style={{ marginBottom: 0 }}>
            Artifacts explored are counted once each. Repeat visits do not increase
            progress.
          </p>
          <button
            type="button"
            className="btn btn-sm mt-2"
            onClick={() => onNavigate("explorer")}
          >
            Explore more artifacts
          </button>
        </div>
      </section>

      <section className="section" aria-labelledby="badges-heading">
        <div className="section-head">
          <h2 id="badges-heading">Achievement collection</h2>
          <span className="dim">
            {unlocked.length} unlocked · {locked.length} locked
          </span>
        </div>

        <div className="tab-row" role="tablist" aria-label="Filter badges">
          {[
            { id: "all", label: `All (${badgeProgress.length})` },
            { id: "unlocked", label: `Unlocked (${unlocked.length})` },
            { id: "locked", label: `Locked (${locked.length})` },
          ].map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <BadgeGrid
          badges={visible}
          emptyMessage={
            tab === "unlocked"
              ? "No badges unlocked yet. Open an artifact to earn your first one."
              : "Everything is unlocked. Outstanding detective work."
          }
        />
      </section>

      <section className="section" aria-labelledby="reset-heading">
        <div className="section-head">
          <h2 id="reset-heading">Saved data</h2>
        </div>
        <div className="card">
          <p className="muted">
            Progress is stored in this browser only, under a versioned localStorage
            key. It does not sync across devices or browsers, and there is no account
            system.
          </p>

          {confirmingReset ? (
            <div className="notice" role="alert">
              <p>
                This permanently clears all points, badges, exploration and history
                saved in this browser.
              </p>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    onReset();
                    setConfirmingReset(false);
                  }}
                >
                  Yes, reset my progress
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmingReset(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmingReset(true)}
            >
              Reset progress
            </button>
          )}

          <p className="dim mt-2" style={{ marginBottom: 0 }}>
            Schema version {progress.version} · {progress.quizHistory.length} quiz
            record{progress.quizHistory.length === 1 ? "" : "s"} ·{" "}
            {progress.decoderHistory.length} decoder record
            {progress.decoderHistory.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>
    </>
  );
}

export default ExplorerProfile;
