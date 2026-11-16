/**
 * Explorer achievement (badge) engine.
 *
 * The engine is independent of React and of the UI. It takes a badge
 * definition set, a metrics snapshot derived from saved progress, and the
 * already-unlocked ids, then reports which badges should unlock.
 *
 * Requirements are declarative in `badges.json`, so new achievements can be
 * added without touching this module as long as they use an existing
 * requirement type:
 *
 *   { "type": "count", "metric": "decoderPuzzlesCompleted", "target": 5 }
 *   { "type": "destination", "destination": "Moon" }
 *   { "type": "accuracy", "target": 80 }
 *   { "type": "all_badges" }
 */

/**
 * Build the metrics object used by requirements from a saved progress record.
 *
 * @param {Object} progress - the persisted player progress
 * @param {Array<{id: string, destination: string}>} [artifacts] - artifact index
 * @returns {Object} metrics
 */
export function buildMetrics(progress, artifacts = []) {
  const statistics = progress?.statistics || {};
  const exploredIds = Array.isArray(progress?.exploration?.exploredArtifactIds)
    ? progress.exploration.exploredArtifactIds
    : [];
  const quizHistory = Array.isArray(progress?.quizHistory) ? progress.quizHistory : [];

  const destinationById = new Map(
    (Array.isArray(artifacts) ? artifacts : []).map((artifact) => [
      artifact.id,
      artifact.destination,
    ]),
  );

  const destinations = new Set();
  let moon = 0;
  let mars = 0;
  let deepSpace = 0;

  for (const id of new Set(exploredIds)) {
    const destination = destinationById.get(id);
    if (!destination) continue;
    destinations.add(destination);
    if (destination === "Moon") moon += 1;
    else if (destination === "Mars") mars += 1;
    else if (destination === "Deep Space") deepSpace += 1;
  }

  const accuracies = quizHistory
    .map((entry) => Number(entry?.accuracy))
    .filter((value) => Number.isFinite(value));

  return {
    totalScore: Number(statistics.totalScore) || 0,
    quizzesCompleted: Number(statistics.quizzesCompleted) || 0,
    questionsAnswered: Number(statistics.questionsAnswered) || 0,
    correctAnswers: Number(statistics.correctAnswers) || 0,
    incorrectAnswers: Number(statistics.incorrectAnswers) || 0,
    decoderPuzzlesCompleted: Number(statistics.decoderPuzzlesCompleted) || 0,
    artifactsExplored: new Set(exploredIds).size,
    bestQuizAccuracy: accuracies.length > 0 ? Math.max(...accuracies) : 0,
    perfectQuizzes: accuracies.filter((value) => value === 100).length,
    destinations: [...destinations],
    moonArtifactsExplored: moon,
    marsArtifactsExplored: mars,
    deepSpaceArtifactsExplored: deepSpace,
  };
}

/**
 * Evaluate a single requirement.
 *
 * @param {Object} requirement
 * @param {Object} metrics
 * @param {string[]} unlockedBadgeIds
 * @param {Array<Object>} allBadges
 * @returns {{satisfied: boolean, current: number, target: number}}
 */
export function evaluateRequirement(requirement, metrics, unlockedBadgeIds, allBadges) {
  const unlocked = new Set(unlockedBadgeIds || []);

  switch (requirement?.type) {
    case "count": {
      const current = Number(metrics?.[requirement.metric]) || 0;
      const target = Number(requirement.target) || 0;
      return { satisfied: current >= target, current, target };
    }
    case "destination": {
      const explored = Array.isArray(metrics?.destinations) ? metrics.destinations : [];
      const has = explored.includes(requirement.destination);
      return { satisfied: has, current: has ? 1 : 0, target: 1 };
    }
    case "accuracy": {
      const current = Number(metrics?.bestQuizAccuracy) || 0;
      const target = Number(requirement.target) || 0;
      return { satisfied: current >= target && (metrics?.quizzesCompleted || 0) > 0, current, target };
    }
    case "all_badges": {
      const others = (allBadges || []).filter((badge) => badge.requirement?.type !== "all_badges");
      const current = others.filter((badge) => unlocked.has(badge.id)).length;
      return {
        satisfied: others.length > 0 && current === others.length,
        current,
        target: others.length,
      };
    }
    default:
      return { satisfied: false, current: 0, target: 0 };
  }
}

/**
 * Evaluate every badge and return newly unlocked badges plus per-badge progress.
 *
 * Already-unlocked badges are never returned again, which prevents duplicate
 * awards and duplicate unlock timestamps.
 *
 * @param {Object} options
 * @param {Array<Object>} options.badges
 * @param {Object} options.metrics
 * @param {string[]} [options.unlockedBadgeIds]
 * @param {() => Date} [options.now]
 * @returns {{newlyUnlocked: Array<Object>, progress: Array<Object>, metrics: Object}}
 */
export function evaluateBadges({
  badges,
  metrics,
  unlockedBadgeIds = [],
  now = () => new Date(),
}) {
  if (!Array.isArray(badges)) {
    throw new Error("evaluateBadges requires a badge definition array.");
  }

  const unlockedSet = new Set(unlockedBadgeIds || []);
  const newlyUnlocked = [];
  const progress = [];

  // Mastery badges are evaluated after all others so "all other badges"
  // can be satisfied in the same pass.
  const ordered = [
    ...badges.filter((badge) => badge.requirement?.type !== "all_badges"),
    ...badges.filter((badge) => badge.requirement?.type === "all_badges"),
  ];

  for (const badge of ordered) {
    const alreadyUnlocked = unlockedSet.has(badge.id);
    const evaluation = evaluateRequirement(
      badge.requirement,
      metrics,
      [...unlockedSet],
      badges,
    );

    if (!alreadyUnlocked && evaluation.satisfied) {
      unlockedSet.add(badge.id);
      newlyUnlocked.push({
        ...badge,
        unlockedAt: now().toISOString(),
      });
    }

    progress.push({
      badgeId: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      points: badge.points,
      requirement: badge.requirement,
      unlocked: unlockedSet.has(badge.id),
      current: Math.min(evaluation.current, evaluation.target || evaluation.current),
      target: evaluation.target,
      percent:
        evaluation.target > 0
          ? Math.min(100, Math.round((evaluation.current / evaluation.target) * 100))
          : 0,
      satisfied: evaluation.satisfied,
    });
  }

  // Preserve the definition order for UI consistency.
  const progressInOrder = badges.map(
    (badge) => progress.find((entry) => entry.badgeId === badge.id),
  );

  return { newlyUnlocked, progress: progressInOrder, metrics };
}

/**
 * Count unlocked badges in a progress record.
 * @param {Object} progress
 */
export function countUnlockedBadges(progress) {
  return Array.isArray(progress?.achievements?.unlockedBadgeIds)
    ? progress.achievements.unlockedBadgeIds.length
    : 0;
}

/**
 * Points earned from unlocked badges.
 * @param {Object} progress
 * @param {Array<Object>} badges
 */
export function getBadgePoints(progress, badges) {
  const unlocked = new Set(progress?.achievements?.unlockedBadgeIds || []);
  return (badges || [])
    .filter((badge) => unlocked.has(badge.id))
    .reduce((total, badge) => total + (Number(badge.points) || 0), 0);
}
