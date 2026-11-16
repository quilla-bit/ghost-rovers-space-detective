/**
 * Shared constants for the Junior Space Detective application.
 *
 * Every engine, service and component imports its vocabulary from here so that
 * data files, validation and scoring can never drift apart.
 */

/** Version tag written into every saved progress record. */
export const SCHEMA_VERSION = 1;

/** Versioned localStorage key. Bump the suffix only with a migration. */
export const STORAGE_KEY = "junior_space_detective_progress_v1";

/** Destinations supported by the artifact dataset and UI filters. */
export const DESTINATIONS = ["Moon", "Mars", "Deep Space"];

/** Difficulty levels, easiest first. */
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

/** Human-readable labels for difficulty values. */
export const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Artifact status vocabulary. These describe hardware condition, not mission
 * success, so a finished mission can still have functioning hardware
 * (for example a passive retro-reflector).
 */
export const ARTIFACT_STATUSES = [
  "operational",
  "partially_operational",
  "inactive",
  "mission_complete",
  "retired",
  "destroyed",
];

/** Human-readable labels for artifact statuses. */
export const STATUS_LABELS = {
  operational: "Operational",
  partially_operational: "Partially operational",
  inactive: "Inactive",
  mission_complete: "Mission complete",
  retired: "Retired",
  destroyed: "Destroyed",
};

/** Question formats supported by the quiz engine. */
export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "artifact_identification",
  "mission_knowledge",
  "scientific_discovery",
];

/** Decoder puzzle formats supported by the decoder engine. */
export const PUZZLE_TYPES = [
  "caesar_cipher",
  "letter_substitution",
  "number_to_letter",
  "artifact_identification",
];

/** Decoder state-machine states. */
export const DECODER_STATES = Object.freeze({
  IDLE: "IDLE",
  PUZZLE_ACTIVE: "PUZZLE_ACTIVE",
  RETRY_AVAILABLE: "RETRY_AVAILABLE",
  COMPLETED: "COMPLETED",
  NEXT_PUZZLE: "NEXT_PUZZLE",
});

/** Base points awarded per difficulty for a correct quiz answer. */
export const POINTS_BY_DIFFICULTY = Object.freeze({
  beginner: 10,
  intermediate: 20,
  advanced: 30,
});

/** Points removed from an answer for each hint the player reveals. */
export const HINT_PENALTY_POINTS = 5;

/** A hinted answer never drops below this fraction of its base value. */
export const MIN_SCORE_FACTOR = 0.25;

/** Default number of questions in a quiz session. */
export const DEFAULT_QUESTION_COUNT = 5;

/** Default attempts allowed per decoder puzzle (null means unlimited). */
export const DEFAULT_MAX_ATTEMPTS = 3;

/** Decoder puzzles shown per decoder "run" before the collection is exhausted. */
export const DEFAULT_PUZZLE_COUNT = 5;

/** Activity event names shared between hooks, services and badge evaluation. */
export const EVENTS = Object.freeze({
  ARTIFACT_EXPLORED: "ARTIFACT_EXPLORED",
  QUIZ_STARTED: "QUIZ_STARTED",
  QUIZ_COMPLETED: "QUIZ_COMPLETED",
  DECODER_STARTED: "DECODER_STARTED",
  DECODER_COMPLETED: "DECODER_COMPLETED",
  BADGE_UNLOCKED: "BADGE_UNLOCKED",
  PROGRESS_RESET: "PROGRESS_RESET",
});

/** Badge requirement categories understood by the badge engine. */
export const REQUIREMENT_TYPES = ["count", "destination", "accuracy", "all_badges"];

/** Badge rarity labels. */
export const RARITIES = ["common", "uncommon", "rare", "legendary"];

/** Upper bound used when sampling questions for a session. */
export const MAX_QUESTIONS_PER_QUIZ = 20;

/** Minimum accepted answer length for open text answers. */
export const MIN_ANSWER_LENGTH = 1;

/** Maximum accepted answer length for open text answers. */
export const MAX_ANSWER_LENGTH = 120;
