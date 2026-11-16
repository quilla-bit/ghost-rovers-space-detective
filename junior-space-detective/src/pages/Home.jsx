import StatCard from "../components/shared/StatCard.jsx";
import ProgressBar from "../components/shared/ProgressBar.jsx";
import BadgeCard from "../components/shared/BadgeCard.jsx";
import { getDatasetSummary } from "../services/artifactService.js";
import { calculateAccuracy } from "../utils/scoring.js";

const ACTIVITIES = [
  {
    id: "explorer",
    icon: "🛰️",
    title: "Artifact Explorer",
    description:
      "Open mission files for NASA hardware left on the Moon, Mars and deep space.",
  },
  {
    id: "quiz",
    icon: "🔍",
    title: "Junior Space Detective",
    description:
      "Answer questions about missions and discoveries, then debrief with your score.",
  },
  {
    id: "decoder",
    icon: "🗝️",
    title: "Decoder Minigame",
    description:
      "Decode simulated transmissions using ciphers, number codes and clue hunting.",
  },
];

/**
 * Mission Control dashboard: player snapshot, activities and recent awards.
 */
export function Home({ statistics, metrics, badgeProgress, onNavigate }) {
  const summary = getDatasetSummary();
  const accuracy = calculateAccuracy(
    statistics.correctAnswers,
    statistics.questionsAnswered,
  );
  const unlocked = badgeProgress.filter((badge) => badge.unlocked);
  const nextBadge = badgeProgress
    .filter((badge) => !badge.unlocked)
    .sort((a, b) => b.percent - a.percent)[0];

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <p className="eyebrow">NASA Space Apps Challenge · Educational game</p>
        <h1 id="hero-heading">Abandoned, but not forgotten.</h1>
        <p className="lede">
          When a mission ends, the hardware often stays behind: descent stages on the
          Moon, rovers parked on Mars, and probes still coasting between the stars.
          Become a Junior Space Detective, read the mission files, and learn what these
          machines discovered.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("explorer")}
          >
            Start exploring artifacts
          </button>
          <button type="button" className="btn" onClick={() => onNavigate("quiz")}>
            Take the detective quiz
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onNavigate("decoder")}
          >
            Open the decoder
          </button>
        </div>
      </section>

      <section className="section" aria-labelledby="stats-heading">
        <div className="section-head">
          <h2 id="stats-heading">Your mission record</h2>
          <span className="dim">Saved in this browser</span>
        </div>
        <div className="grid grid-4">
          <StatCard label="Total points" value={statistics.totalScore} />
          <StatCard
            label="Artifacts explored"
            value={`${metrics.artifactsExplored}/${summary.artifactCount}`}
          />
          <StatCard label="Quizzes completed" value={statistics.quizzesCompleted} />
          <StatCard
            label="Decoder puzzles"
            value={statistics.decoderPuzzlesCompleted}
          />
          <StatCard
            label="Answer accuracy"
            value={statistics.questionsAnswered > 0 ? `${accuracy}%` : "—"}
            hint={
              statistics.questionsAnswered > 0
                ? `${statistics.correctAnswers} of ${statistics.questionsAnswered} correct`
                : "No answers yet"
            }
          />
          <StatCard
            label="Badges unlocked"
            value={`${unlocked.length}/${badgeProgress.length}`}
          />
        </div>
      </section>

      <section className="section" aria-labelledby="activities-heading">
        <div className="section-head">
          <h2 id="activities-heading">Available activities</h2>
        </div>
        <div className="grid grid-3">
          {ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              type="button"
              className="card activity-card"
              onClick={() => onNavigate(activity.id)}
            >
              <span className="activity-icon" aria-hidden="true">
                {activity.icon}
              </span>
              <h3>{activity.title}</h3>
              <p>{activity.description}</p>
              <span className="chip">Open</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="awards-heading">
        <div className="section-head">
          <h2 id="awards-heading">Recent achievements</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate("profile")}
          >
            View all badges
          </button>
        </div>

        {unlocked.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              No badges yet. Exploring a single artifact is enough to earn Moon
              Explorer, Red Planet Detective or Deep Space Traveler.
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {unlocked.slice(-3).reverse().map((badge) => (
              <BadgeCard key={badge.badgeId} badge={badge} {...badge} />
            ))}
          </div>
        )}

        {nextBadge ? (
          <div className="card mt-2">
            <div className="row spread">
              <h3 style={{ margin: 0 }}>
                Next badge: {nextBadge.name}
              </h3>
              <span className="chip">{nextBadge.percent}%</span>
            </div>
            <p className="dim">{nextBadge.description}</p>
            <ProgressBar
              value={nextBadge.current}
              max={nextBadge.target}
              label="Progress"
            />
          </div>
        ) : null}
      </section>

      <section className="section" aria-labelledby="about-heading">
        <div className="section-head">
          <h2 id="about-heading">About this mission</h2>
        </div>
        <div className="card">
          <p className="muted">
            This game contains {summary.artifactCount} researched NASA artifacts,{" "}
            {summary.questionCount} quiz questions and {summary.puzzleCount} decoder
            puzzles. Artifact facts are drawn from NASA mission pages and the NASA
            NSSDCA, and every artifact file links to its sources.
          </p>
          <p className="notice">
            Decoder messages are simulated puzzles. They are clearly labelled in the
            game and are never presented as real transmissions. Player progress is
            stored only in this browser and does not sync across devices.
          </p>
          <p className="dim" style={{ marginBottom: 0 }}>
            Open an artifact file, complete a quiz and solve a decoder puzzle to fill
            your explorer profile. Each artifact is counted once, and every badge is
            awarded at most once.
          </p>
        </div>
      </section>
    </>
  );
}

export default Home;
