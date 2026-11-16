import { SCHEMA_VERSION, STORAGE_KEY } from "../utils/constants.js";

/**
 * Centralised localStorage persistence.
 *
 * There is no backend. Progress lives in the player's browser only, so it does
 * not follow them to another device or browser.
 *
 * This service is defensive by design: a missing localStorage implementation,
 * malformed JSON, an outdated schema or a quota error must never crash the
 * application or destroy the player's save without explanation.
 */

/**
 * A fresh, valid progress record.
 * @param {() => Date} [now]
 */
export function createDefaultProgress(now = () => new Date()) {
  return {
    version: SCHEMA_VERSION,
    player: {
      id: "local-player",
      createdAt: now().toISOString(),
      lastPlayed: null,
    },
    statistics: {
      totalScore: 0,
      quizzesCompleted: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      decoderPuzzlesCompleted: 0,
      artifactsExplored: 0,
    },
    exploration: {
      exploredArtifactIds: [],
    },
    achievements: {
      unlockedBadgeIds: [],
      unlockHistory: [],
    },
    quizHistory: [],
    decoderHistory: [],
  };
}

/** @param {unknown} value */
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** @param {unknown} value */
function toSafeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

/** @param {unknown} value */
function toSafeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

/**
 * Validate and repair a candidate progress record.
 *
 * Repairs are intentional: missing fields are filled from defaults, invalid
 * numbers are clamped and unknown ids are de-duplicated. Callers can inspect
 * `issues` to see what had to change.
 *
 * @param {unknown} raw
 * @param {() => Date} [now]
 * @returns {{valid: boolean, progress: Object, issues: string[]}}
 */
export function validateStoredProgress(raw, now = () => new Date()) {
  const issues = [];
  const defaults = createDefaultProgress(now);

  if (!isObject(raw)) {
    return {
      valid: false,
      progress: defaults,
      issues: ["Stored progress was not an object; starting fresh."],
    };
  }

  if (raw.version !== SCHEMA_VERSION) {
    issues.push(
      `Progress version ${String(raw.version)} differs from current version ${SCHEMA_VERSION}.`,
    );
  }

  const player = isObject(raw.player) ? raw.player : {};
  const statistics = isObject(raw.statistics) ? raw.statistics : {};
  const exploration = isObject(raw.exploration) ? raw.exploration : {};
  const achievements = isObject(raw.achievements) ? raw.achievements : {};

  const exploredIds = Array.isArray(exploration.exploredArtifactIds)
    ? [...new Set(exploration.exploredArtifactIds.filter((id) => typeof id === "string"))]
    : [];
  if (!Array.isArray(exploration.exploredArtifactIds)) {
    issues.push("Explored artifact list was missing or invalid.");
  }

  const unlockedBadgeIds = Array.isArray(achievements.unlockedBadgeIds)
    ? [
        ...new Set(
          achievements.unlockedBadgeIds.filter((id) => typeof id === "string"),
        ),
      ]
    : [];
  if (!Array.isArray(achievements.unlockedBadgeIds)) {
    issues.push("Unlocked badge list was missing or invalid.");
  }

  const unlockHistoryRaw = Array.isArray(achievements.unlockHistory)
    ? achievements.unlockHistory
    : [];
  const unlockHistory = unlockHistoryRaw
    .filter((entry) => isObject(entry) && typeof entry.badgeId === "string")
    .map((entry) => ({
      badgeId: entry.badgeId,
      unlockedAt: toSafeString(entry.unlockedAt, null),
    }));

  const quizHistory = (Array.isArray(raw.quizHistory) ? raw.quizHistory : [])
    .filter((entry) => isObject(entry))
    .map((entry) => ({
      sessionId: toSafeString(entry.sessionId, `unknown-${toSafeString(entry.completedAt, "")}`),
      score: toSafeNumber(entry.score),
      totalQuestions: toSafeNumber(entry.totalQuestions),
      correctAnswers: toSafeNumber(entry.correctAnswers),
      incorrectAnswers: toSafeNumber(entry.incorrectAnswers),
      accuracy: Math.min(100, toSafeNumber(entry.accuracy)),
      difficultyBreakdown: isObject(entry.difficultyBreakdown)
        ? entry.difficultyBreakdown
        : {},
      completedAt: toSafeString(entry.completedAt, null),
    }));

  const decoderHistory = (Array.isArray(raw.decoderHistory) ? raw.decoderHistory : [])
    .filter((entry) => isObject(entry) && typeof entry.puzzleId === "string")
    .map((entry) => ({
      puzzleId: entry.puzzleId,
      difficulty: toSafeString(entry.difficulty, "beginner"),
      solved: entry.solved !== false,
      attempts: toSafeNumber(entry.attempts),
      hintsUsed: toSafeNumber(entry.hintsUsed),
      score: toSafeNumber(entry.score),
      completedAt: toSafeString(entry.completedAt, null),
    }));

  const progress = {
    version: SCHEMA_VERSION,
    player: {
      id: toSafeString(player.id, defaults.player.id),
      createdAt: toSafeString(player.createdAt, defaults.player.createdAt),
      lastPlayed: typeof player.lastPlayed === "string" ? player.lastPlayed : null,
    },
    statistics: {
      totalScore: toSafeNumber(statistics.totalScore),
      quizzesCompleted: toSafeNumber(statistics.quizzesCompleted),
      questionsAnswered: toSafeNumber(statistics.questionsAnswered),
      correctAnswers: toSafeNumber(statistics.correctAnswers),
      incorrectAnswers: toSafeNumber(statistics.incorrectAnswers),
      decoderPuzzlesCompleted: toSafeNumber(statistics.decoderPuzzlesCompleted),
      artifactsExplored: Math.max(
        toSafeNumber(statistics.artifactsExplored),
        exploredIds.length,
      ),
    },
    exploration: { exploredArtifactIds: exploredIds },
    achievements: { unlockedBadgeIds, unlockHistory },
    quizHistory,
    decoderHistory,
  };

  // Cross-check counters against their history so a partially-written save
  // cannot inflate progress.
  progress.statistics.artifactsExplored = exploredIds.length;

  const uniqueDecoderIds = new Set(
    decoderHistory.filter((entry) => entry.solved).map((entry) => entry.puzzleId),
  );
  progress.statistics.decoderPuzzlesCompleted = uniqueDecoderIds.size;

  const valid = issues.length === 0;
  return { valid, progress, issues };
}

/**
 * Create a storage service bound to a Storage-like object.
 *
 * @param {Object} [options]
 * @param {Storage|null} [options.storage] - defaults to window.localStorage
 * @param {string} [options.key]
 * @param {() => Date} [options.now]
 * @param {(message: string, error?: unknown) => void} [options.onWarning]
 */
export function createStorageService({
  storage,
  key = STORAGE_KEY,
  now = () => new Date(),
  onWarning = () => {},
} = {}) {
  let backend;
  if (storage !== undefined) {
    backend = storage;
  } else {
    try {
      backend = typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      backend = null;
    }
  }

  const available = Boolean(
    backend && typeof backend.getItem === "function" && typeof backend.setItem === "function",
  );

  let lastSerialized = null;
  let writeCount = 0;

  /**
   * Read and repair saved progress. Never throws.
   * @returns {Object} valid progress
   */
  function loadProgress() {
    if (!available) {
      return createDefaultProgress(now);
    }
    let raw = null;
    try {
      raw = backend.getItem(key);
    } catch (error) {
      onWarning("Could not read saved progress.", error);
      return createDefaultProgress(now);
    }
    if (raw === null || raw === undefined || raw === "") {
      return createDefaultProgress(now);
    }
    try {
      const parsed = JSON.parse(raw);
      const { progress, issues } = validateStoredProgress(parsed, now);
      if (issues.length > 0) {
        issues.forEach((issue) => onWarning(`Saved progress repaired: ${issue}`));
      }
      return progress;
    } catch (error) {
      onWarning("Saved progress was not valid JSON; starting fresh.", error);
      return createDefaultProgress(now);
    }
  }

  /**
   * Persist progress. Identical payloads are skipped to avoid redundant writes.
   * @param {Object} progress
   * @returns {{saved: boolean, error: string|null}}
   */
  function saveProgress(progress) {
    if (!available) {
      return { saved: false, error: "Browser storage is unavailable." };
    }
    const { progress: safeProgress } = validateStoredProgress(progress, now);
    const serialized = JSON.stringify(safeProgress);
    if (serialized === lastSerialized) {
      return { saved: true, error: null };
    }
    try {
      backend.setItem(key, serialized);
      lastSerialized = serialized;
      writeCount += 1;
      return { saved: true, error: null };
    } catch (error) {
      onWarning("Could not save progress.", error);
      return { saved: false, error: "Could not save progress to browser storage." };
    }
  }

  /**
   * Load, transform and save in one step.
   * @param {(progress: Object) => Object} updater
   */
  function updateProgress(updater) {
    const current = loadProgress();
    const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
    const { progress } = validateStoredProgress(next, now);
    const outcome = saveProgress(progress);
    return { progress, ...outcome };
  }

  /** Remove the saved record. */
  function clearProgress() {
    if (!available) return { cleared: false, error: "Browser storage is unavailable." };
    try {
      backend.removeItem(key);
      lastSerialized = null;
      return { cleared: true, error: null };
    } catch (error) {
      onWarning("Could not clear progress.", error);
      return { cleared: false, error: "Could not clear progress." };
    }
  }

  return {
    key,
    isAvailable: () => available,
    loadProgress,
    saveProgress,
    updateProgress,
    clearProgress,
    validateStoredProgress: (raw) => validateStoredProgress(raw, now),
    /** Number of real writes performed; useful in tests. */
    getWriteCount: () => writeCount,
  };
}

/** Default browser-backed service used by the application. */
export const storageService = createStorageService();

export default storageService;
