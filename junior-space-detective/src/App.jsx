import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "./components/shared/Layout.jsx";
import Home from "./pages/Home.jsx";
import ArtifactExplorer from "./pages/ArtifactExplorer.jsx";
import DetectiveQuiz from "./pages/DetectiveQuiz.jsx";
import DecoderGame from "./pages/DecoderGame.jsx";
import ExplorerProfile from "./pages/ExplorerProfile.jsx";
import { usePlayerProgress } from "./hooks/usePlayerProgress.js";
import progressServiceSingleton from "./services/progressService.js";

/**
 * Application root.
 *
 * Owns navigation and the global progress subscription. Pages stay presentational
 * and receive the actions they need, so business logic never lives in the UI.
 *
 * @param {Object} [props]
 * @param {Object} [props.service] - injectable progress service (used by tests)
 */
export default function App({ service = progressServiceSingleton }) {
  const player = usePlayerProgress(service);
  const [view, setView] = useState("home");
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const navigate = useCallback((next) => {
    setView(next);
    if (typeof window !== "undefined") {
      window.scrollTo?.({ top: 0, behavior: "smooth" });
    }
  }, []);

  const announceBadges = useCallback((newBadges) => {
    if (!Array.isArray(newBadges) || newBadges.length === 0) return;
    setToasts((current) => [
      ...current,
      ...newBadges.map((badge) => {
        toastId.current += 1;
        return {
          id: toastId.current,
          title: "Badge unlocked",
          message: `${badge.name} · +${badge.points} points`,
        };
      }),
    ]);
  }, []);

  // Dismiss the oldest toast periodically while any remain.
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timer = setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const handleExplore = useCallback(
    (artifactId) => {
      const report = player.actions.recordArtifactExplored(artifactId);
      announceBadges(report?.newlyUnlockedBadges);
    },
    [player.actions, announceBadges],
  );

  const handleQuizResults = useCallback(
    (results) => {
      const report = player.actions.recordQuizCompleted(results);
      announceBadges(report?.newlyUnlockedBadges);
    },
    [player.actions, announceBadges],
  );

  const handleDecoderResult = useCallback(
    (payload) => {
      const report = player.actions.recordDecoderCompleted(payload);
      announceBadges(report?.newlyUnlockedBadges);
    },
    [player.actions, announceBadges],
  );

  const handleReset = useCallback(() => {
    player.actions.resetProgress();
    setView("home");
  }, [player.actions]);

  return (
    <Layout
      view={view}
      onNavigate={navigate}
      totalScore={player.statistics.totalScore}
      badgeCount={player.unlockedBadges.length}
      toasts={toasts}
    >
      {player.storageError ? (
        <p className="notice" role="alert">
          {player.storageError} Progress will not be saved after this session.
        </p>
      ) : null}

      {view === "home" ? (
        <Home
          statistics={player.statistics}
          metrics={player.metrics}
          badgeProgress={player.badgeProgress}
          onNavigate={navigate}
        />
      ) : null}

      {view === "explorer" ? (
        <ArtifactExplorer
          exploredArtifactIds={player.exploredArtifactIds}
          onExplore={handleExplore}
          onNavigate={navigate}
        />
      ) : null}

      {view === "quiz" ? (
        <DetectiveQuiz onResults={handleQuizResults} onNavigate={navigate} />
      ) : null}

      {view === "decoder" ? (
        <DecoderGame onPuzzleResult={handleDecoderResult} onNavigate={navigate} />
      ) : null}

      {view === "profile" ? (
        <ExplorerProfile
          progress={player.progress}
          statistics={player.statistics}
          metrics={player.metrics}
          badgeProgress={player.badgeProgress}
          onReset={handleReset}
          onNavigate={navigate}
        />
      ) : null}
    </Layout>
  );
}
