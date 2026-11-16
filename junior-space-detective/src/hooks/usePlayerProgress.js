import { useCallback, useMemo, useSyncExternalStore } from "react";
import progressServiceSingleton from "../services/progressService.js";
import { EVENTS } from "../utils/constants.js";

/**
 * Subscribe React to the central progress service.
 *
 * `useSyncExternalStore` guarantees the component always renders the latest
 * immutable snapshot, so there are no stale-closure or tearing problems when
 * several components record events in the same tick.
 *
 * @param {Object} [service] - injectable service (tests render an isolated one)
 */
export function usePlayerProgress(service = progressServiceSingleton) {
  const subscribe = useCallback((listener) => service.subscribe(listener), [service]);

  const progress = useSyncExternalStore(
    subscribe,
    service.getProgress,
    service.getProgress,
  );

  const metrics = useMemo(() => service.getMetrics(), [service, progress]);
  const badgeProgress = useMemo(
    () => service.getBadgeProgress().progress,
    [service, progress],
  );

  const unlockedBadges = useMemo(
    () => badgeProgress.filter((badge) => badge.unlocked),
    [badgeProgress],
  );
  const lockedBadges = useMemo(
    () => badgeProgress.filter((badge) => !badge.unlocked),
    [badgeProgress],
  );

  const recordArtifactExplored = useCallback(
    (artifactId) =>
      service.recordEvent(EVENTS.ARTIFACT_EXPLORED, {
        artifactId,
      }),
    [service],
  );

  const recordQuizCompleted = useCallback(
    (results) =>
      service.recordEvent(EVENTS.QUIZ_COMPLETED, {
        sessionId: results.sessionId,
        score: results.score,
        totalQuestions: results.totalQuestions,
        correctAnswers: results.correctAnswers,
        incorrectAnswers: results.incorrectAnswers,
        accuracy: results.accuracy,
        difficultyBreakdown: results.difficultyBreakdown,
        completedAt: results.completedAt,
      }),
    [service],
  );

  const recordDecoderCompleted = useCallback(
    (payload) => service.recordEvent(EVENTS.DECODER_COMPLETED, payload),
    [service],
  );

  const recordQuizStarted = useCallback(
    (payload = {}) => service.recordEvent(EVENTS.QUIZ_STARTED, payload),
    [service],
  );

  const recordDecoderStarted = useCallback(
    (payload = {}) => service.recordEvent(EVENTS.DECODER_STARTED, payload),
    [service],
  );

  const resetProgress = useCallback(() => service.resetProgress(), [service]);

  const reload = useCallback(() => service.reload(), [service]);

  return {
    progress,
    statistics: progress.statistics,
    exploredArtifactIds: progress.exploration.exploredArtifactIds,
    totalScore: progress.statistics.totalScore,
    metrics,
    badgeProgress,
    unlockedBadges,
    lockedBadges,
    storageError: service.getStorageError(),
    actions: {
      recordArtifactExplored,
      recordQuizCompleted,
      recordDecoderCompleted,
      recordQuizStarted,
      recordDecoderStarted,
      resetProgress,
      reload,
    },
  };
}

export default usePlayerProgress;
