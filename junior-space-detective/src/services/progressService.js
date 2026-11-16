import badgesData from "../data/badges.json";
import artifactsData from "../data/artifacts.json";
import { EVENTS } from "../utils/constants.js";
import { buildMetrics, evaluateBadges } from "../engines/badgeEngine.js";
import { createStorageService, createDefaultProgress } from "./storageService.js";

/**
 * Central player-progress service.
 *
 * This is the single place where meaningful activity changes saved state:
 *
 *   activity event -> update statistics -> evaluate badges -> persist -> notify
 *
 * React components never mutate progress directly. Hooks subscribe to this
 * service and re-render from its immutable snapshots.
 */

/**
 * @param {Object} [options]
 * @param {ReturnType<typeof createStorageService>} [options.storage]
 * @param {Array<Object>} [options.badges]
 * @param {Array<Object>} [options.artifacts]
 * @param {() => Date} [options.now]
 */
export function createProgressService({
  storage = createStorageService(),
  badges = badgesData.badges,
  artifacts = artifactsData.artifacts,
  now = () => new Date(),
} = {}) {
  let progress = storage.loadProgress();
  let lastEvent = null;
  let lastSaveError = null;
  const listeners = new Set();

  const artifactIndex = artifacts.map((artifact) => ({
    id: artifact.id,
    destination: artifact.destination,
  }));

  function getProgress() {
    return progress;
  }

  function getMetrics() {
    return buildMetrics(progress, artifactIndex);
  }

  function getBadgeProgress() {
    return evaluateBadges({
      badges,
      metrics: getMetrics(),
      unlockedBadgeIds: progress.achievements.unlockedBadgeIds,
      now,
    });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify(event) {
    lastEvent = event;
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        // A broken subscriber must not stop persistence or other subscribers.
        if (typeof console !== "undefined") {
          console.error("Progress listener failed", error);
        }
      }
    }
  }

  function persist() {
    const outcome = storage.saveProgress(progress);
    lastSaveError = outcome.error;
    return outcome;
  }

  /**
   * Apply an activity event.
   * Returns a report describing what changed, including new badges.
   *
   * @param {string} type
   * @param {Object} [payload]
   */
  function recordEvent(type, payload = {}) {
    if (!type) throw new Error("recordEvent requires an event type.");

    const timestamp = payload.completedAt || now().toISOString();
    let next = progress;
    let applied = false;
    let reason = null;

    switch (type) {
      case EVENTS.ARTIFACT_EXPLORED: {
        const artifactId = payload.artifactId;
        if (typeof artifactId !== "string" || artifactId.length === 0) {
          reason = "Missing artifactId.";
          break;
        }
        const exists = artifactIndex.some((artifact) => artifact.id === artifactId);
        if (!exists) {
          reason = `Unknown artifact "${artifactId}".`;
          break;
        }
        if (progress.exploration.exploredArtifactIds.includes(artifactId)) {
          reason = "Artifact already explored.";
          // Still touch lastPlayed so the dashboard stays accurate.
          next = {
            ...progress,
            player: { ...progress.player, lastPlayed: timestamp },
          };
          break;
        }
        const exploredArtifactIds = [
          ...progress.exploration.exploredArtifactIds,
          artifactId,
        ];
        next = {
          ...progress,
          player: { ...progress.player, lastPlayed: timestamp },
          exploration: { ...progress.exploration, exploredArtifactIds },
          statistics: {
            ...progress.statistics,
            artifactsExplored: exploredArtifactIds.length,
          },
        };
        applied = true;
        break;
      }

      case EVENTS.QUIZ_COMPLETED: {
        const sessionId = payload.sessionId || `quiz-${timestamp}`;
        const totalQuestions = Number(payload.totalQuestions) || 0;
        if (totalQuestions <= 0) {
          reason = "Quiz has no questions.";
          break;
        }
        if (progress.quizHistory.some((entry) => entry.sessionId === sessionId)) {
          reason = "Quiz session already recorded.";
          break;
        }
        const correctAnswers = Number(payload.correctAnswers) || 0;
        const incorrectAnswers = Number(payload.incorrectAnswers) || 0;
        const researchScore = Number(payload.score) || 0;
        const accuracy = Number(payload.accuracy) || 0;

        next = {
          ...progress,
          player: { ...progress.player, lastPlayed: timestamp },
          statistics: {
            ...progress.statistics,
            totalScore: progress.statistics.totalScore + researchScore,
            quizzesCompleted: progress.statistics.quizzesCompleted + 1,
            questionsAnswered: progress.statistics.questionsAnswered + totalQuestions,
            correctAnswers: progress.statistics.correctAnswers + correctAnswers,
            incorrectAnswers: progress.statistics.incorrectAnswers + incorrectAnswers,
          },
          quizHistory: [
            ...progress.quizHistory,
            {
              sessionId,
              score: researchScore,
              totalQuestions,
              correctAnswers,
              incorrectAnswers,
              accuracy,
              difficultyBreakdown: payload.difficultyBreakdown || {},
              completedAt: timestamp,
            },
          ],
        };
        applied = true;
        break;
      }

      case EVENTS.DECODER_COMPLETED: {
        const puzzleId = payload.puzzleId;
        if (typeof puzzleId !== "string" || puzzleId.length === 0) {
          reason = "Missing puzzleId.";
          break;
        }
        const solved = payload.solved !== false;
        const alreadySolved = progress.decoderHistory.some(
          (entry) => entry.puzzleId === puzzleId && entry.solved,
        );

        if (solved && alreadySolved) {
          reason = "Puzzle already completed.";
          break;
        }
        if (!solved) {
          // Failed attempts are recorded for the session but award nothing.
          next = {
            ...progress,
            player: { ...progress.player, lastPlayed: timestamp },
            decoderHistory: [
              ...progress.decoderHistory,
              {
                puzzleId,
                difficulty: payload.difficulty || "beginner",
                solved: false,
                attempts: Number(payload.attempts) || 0,
                hintsUsed: Number(payload.hintsUsed) || 0,
                score: 0,
                completedAt: timestamp,
              },
            ],
          };
          applied = true;
          break;
        }

        const decoderScore = Number(payload.score) || 0;
        next = {
          ...progress,
          player: { ...progress.player, lastPlayed: timestamp },
          statistics: {
            ...progress.statistics,
            totalScore: progress.statistics.totalScore + decoderScore,
            decoderPuzzlesCompleted: progress.statistics.decoderPuzzlesCompleted + 1,
          },
          decoderHistory: [
            ...progress.decoderHistory,
            {
              puzzleId,
              difficulty: payload.difficulty || "beginner",
              solved: true,
              attempts: Number(payload.attempts) || 0,
              hintsUsed: Number(payload.hintsUsed) || 0,
              score: decoderScore,
              completedAt: timestamp,
            },
          ],
        };
        applied = true;
        break;
      }

      case EVENTS.QUIZ_STARTED:
      case EVENTS.DECODER_STARTED: {
        next = {
          ...progress,
          player: { ...progress.player, lastPlayed: timestamp },
        };
        applied = true;
        break;
      }

      default:
        reason = `Unknown event type "${type}".`;
    }

    if (!applied) {
      // Even a no-op event persists the lastPlayed touch when one happened.
      if (next !== progress) {
        progress = next;
        persist();
      }
      return { applied: false, reason, progress, newlyUnlockedBadges: [] };
    }

    // Evaluate achievements against the updated state.
    const metrics = buildMetrics(next, artifactIndex);
    const { newlyUnlocked } = evaluateBadges({
      badges,
      metrics,
      unlockedBadgeIds: next.achievements.unlockedBadgeIds,
      now,
    });

    if (newlyUnlocked.length > 0) {
      const rewardPoints = newlyUnlocked.reduce(
        (total, badge) => total + (Number(badge.points) || 0),
        0,
      );
      next = {
        ...next,
        statistics: {
          ...next.statistics,
          totalScore: next.statistics.totalScore + rewardPoints,
        },
        achievements: {
          unlockedBadgeIds: [
            ...next.achievements.unlockedBadgeIds,
            ...newlyUnlocked.map((badge) => badge.id),
          ],
          unlockHistory: [
            ...next.achievements.unlockHistory,
            ...newlyUnlocked.map((badge) => ({
              badgeId: badge.id,
              unlockedAt: badge.unlockedAt,
            })),
          ],
        },
      };
    }

    progress = next;
    const save = persist();

    const event = {
      type,
      payload,
      newlyUnlockedBadges: newlyUnlocked,
      progress,
      saved: save.saved,
      saveError: lastSaveError,
    };
    notify(event);

    return {
      applied: true,
      progress,
      newlyUnlockedBadges: newlyUnlocked,
      saved: save.saved,
      saveError: lastSaveError,
    };
  }

  /** Wipe all saved progress and return to defaults. */
  function resetProgress() {
    const fresh = createDefaultProgress(now);
    progress = fresh;
    const outcome = storage.saveProgress(progress);
    lastSaveError = outcome.error;
    notify({
      type: EVENTS.PROGRESS_RESET,
      payload: {},
      newlyUnlockedBadges: [],
      progress,
      saved: outcome.saved,
      saveError: lastSaveError,
    });
    return { progress, saved: outcome.saved, saveError: lastSaveError };
  }

  /** Re-read saved progress (useful if another tab changed it). */
  function reload() {
    progress = storage.loadProgress();
    notify({ type: "RELOADED", payload: {}, newlyUnlockedBadges: [], progress });
    return progress;
  }

  return {
    getProgress,
    getMetrics,
    getBadgeProgress,
    subscribe,
    recordEvent,
    resetProgress,
    reload,
    getLastEvent: () => lastEvent,
    getStorageError: () => lastSaveError,
    getUnlockedBadges: () =>
      badges.filter((badge) =>
        progress.achievements.unlockedBadgeIds.includes(badge.id),
      ),
  };
}

/** Shared application instance. */
export const progressService = createProgressService();

export default progressService;
