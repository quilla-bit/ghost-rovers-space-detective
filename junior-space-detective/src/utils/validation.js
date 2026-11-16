import {
  ARTIFACT_STATUSES,
  DESTINATIONS,
  DIFFICULTIES,
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
  PUZZLE_TYPES,
  QUESTION_TYPES,
  RARITIES,
  REQUIREMENT_TYPES,
} from "./constants.js";

/**
 * Input and dataset validation.
 *
 * `normalizeAnswer` is used by both engines before comparing a player's text
 * to accepted answers, so "  Water " and "water" are treated as identical.
 */

/**
 * Normalise free-text player input for comparison.
 * - trims leading/trailing whitespace
 * - collapses internal whitespace
 * - lowercases
 * - strips surrounding punctuation (but keeps inner hyphens/apostrophes)
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeAnswer(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

/**
 * True when the player's input matches any accepted answer.
 * @param {unknown} input
 * @param {string[]} acceptedAnswers
 * @returns {boolean}
 */
export function answersMatch(input, acceptedAnswers) {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return (Array.isArray(acceptedAnswers) ? acceptedAnswers : []).some(
    (answer) => normalizeAnswer(answer) === normalized,
  );
}

/**
 * Validate a single open answer before scoring it.
 * @param {unknown} input
 * @returns {{valid: boolean, normalized: string, reason: string|null}}
 */
export function validateAnswerInput(input) {
  if (typeof input !== "string") {
    return { valid: false, normalized: "", reason: "Answer must be text." };
  }
  const normalized = normalizeAnswer(input);
  if (normalized.length < MIN_ANSWER_LENGTH) {
    return { valid: false, normalized: "", reason: "Please type an answer first." };
  }
  if (normalized.length > MAX_ANSWER_LENGTH) {
    return {
      valid: false,
      normalized,
      reason: `Answers are limited to ${MAX_ANSWER_LENGTH} characters.`,
    };
  }
  return { valid: true, normalized, reason: null };
}

/** @param {unknown} value */
export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** @param {unknown} value */
export function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** @param {unknown} value */
export function isValidIsoDate(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

/**
 * Validate an http(s) URL without touching the network.
 * @param {unknown} value
 */
export function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * @param {Array<{path: string, message: string}>} errors
 * @param {string} path
 * @param {string} message
 */
function push(errors, path, message) {
  errors.push({ path, message });
}

/**
 * Validate the artifact dataset against the documented schema.
 *
 * @param {{artifacts?: unknown}} dataset
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>, warnings: string[]}}
 */
export function validateArtifacts(dataset) {
  const errors = [];
  const warnings = [];

  if (!dataset || !Array.isArray(dataset.artifacts)) {
    return {
      valid: false,
      errors: [{ path: "artifacts", message: "Dataset must contain an artifacts array." }],
      warnings,
    };
  }

  const seenIds = new Set();
  const ids = new Set(
    dataset.artifacts.filter((a) => a && typeof a.id === "string").map((a) => a.id),
  );

  dataset.artifacts.forEach((artifact, index) => {
    const path = `artifacts[${index}]`;
    if (!artifact || typeof artifact !== "object") {
      push(errors, path, "Artifact must be an object.");
      return;
    }

    const requiredStrings = [
      "id",
      "name",
      "category",
      "mission",
      "agency",
      "locationDescription",
      "historicalSignificance",
      "educationalSummary",
    ];
    for (const field of requiredStrings) {
      if (!isNonEmptyString(artifact[field])) {
        push(errors, `${path}.${field}`, "Required non-empty string.");
      }
    }

    if (isNonEmptyString(artifact.id)) {
      if (seenIds.has(artifact.id)) {
        push(errors, `${path}.id`, `Duplicate artifact id "${artifact.id}".`);
      }
      seenIds.add(artifact.id);
    }

    if (!DESTINATIONS.includes(artifact.destination)) {
      push(errors, `${path}.destination`, `Invalid destination "${artifact.destination}".`);
    }
    if (!DIFFICULTIES.includes(artifact.difficulty)) {
      push(errors, `${path}.difficulty`, `Invalid difficulty "${artifact.difficulty}".`);
    }
    if (!ARTIFACT_STATUSES.includes(artifact.status)) {
      push(errors, `${path}.status`, `Invalid status "${artifact.status}".`);
    }
    if (!isNonEmptyString(artifact.communicationStatus)) {
      push(errors, `${path}.communicationStatus`, "Required non-empty string.");
    }
    if (!isValidIsoDate(artifact.deploymentDate)) {
      push(errors, `${path}.deploymentDate`, "Must be a valid YYYY-MM-DD date.");
    }

    for (const field of ["missionObjective", "scientificDiscoveries", "funFacts"]) {
      if (!isStringArray(artifact[field]) || artifact[field].length === 0) {
        push(errors, `${path}.${field}`, "Required non-empty array of strings.");
      }
    }

    if (!Array.isArray(artifact.sources) || artifact.sources.length === 0) {
      push(errors, `${path}.sources`, "At least one source is required.");
    } else {
      artifact.sources.forEach((source, sourceIndex) => {
        const sourcePath = `${path}.sources[${sourceIndex}]`;
        if (!source || typeof source !== "object") {
          push(errors, sourcePath, "Source must be an object.");
          return;
        }
        if (!isNonEmptyString(source.title)) {
          push(errors, `${sourcePath}.title`, "Source title is required.");
        }
        if (!isValidHttpUrl(source.url)) {
          push(errors, `${sourcePath}.url`, "Source URL must be a valid http(s) URL.");
        }
        if (!isNonEmptyString(source.publisher)) {
          push(errors, `${sourcePath}.publisher`, "Source publisher is required.");
        }
      });
    }

    if (!Array.isArray(artifact.relatedArtifacts)) {
      push(errors, `${path}.relatedArtifacts`, "Must be an array.");
    } else {
      artifact.relatedArtifacts.forEach((relatedId) => {
        if (relatedId === artifact.id) {
          push(errors, `${path}.relatedArtifacts`, "Artifact cannot relate to itself.");
        } else if (!ids.has(relatedId)) {
          push(
            errors,
            `${path}.relatedArtifacts`,
            `Unknown related artifact "${relatedId}".`,
          );
        }
      });
    }

    if (!Array.isArray(artifact.quizQuestionIds)) {
      push(errors, `${path}.quizQuestionIds`, "Must be an array.");
    }
    if (artifact.image !== null && !isNonEmptyString(artifact.image)) {
      push(errors, `${path}.image`, "Image must be null or a path string.");
    }
  });

  if (dataset.artifacts.length === 0) {
    warnings.push("Artifact dataset is empty.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate quiz question data.
 * @param {{questions?: unknown}} dataset
 */
export function validateQuestions(dataset) {
  const errors = [];
  if (!dataset || !Array.isArray(dataset.questions)) {
    return {
      valid: false,
      errors: [{ path: "questions", message: "Dataset must contain a questions array." }],
    };
  }

  const seen = new Set();
  dataset.questions.forEach((question, index) => {
    const path = `questions[${index}]`;
    if (!question || typeof question !== "object") {
      push(errors, path, "Question must be an object.");
      return;
    }
    for (const field of ["id", "artifactId", "question", "explanation"]) {
      if (!isNonEmptyString(question[field])) {
        push(errors, `${path}.${field}`, "Required non-empty string.");
      }
    }
    if (seen.has(question.id)) {
      push(errors, `${path}.id`, `Duplicate question id "${question.id}".`);
    }
    seen.add(question.id);

    if (!QUESTION_TYPES.includes(question.type)) {
      push(errors, `${path}.type`, `Invalid question type "${question.type}".`);
    }
    if (!DIFFICULTIES.includes(question.difficulty)) {
      push(errors, `${path}.difficulty`, `Invalid difficulty "${question.difficulty}".`);
    }
    if (!isStringArray(question.options) || question.options.length < 2) {
      push(errors, `${path}.options`, "At least two answer options are required.");
    }
    if (typeof question.correctAnswer !== "string") {
      push(errors, `${path}.correctAnswer`, "correctAnswer must be a string.");
    } else if (
      isStringArray(question.options) &&
      !question.options.includes(question.correctAnswer)
    ) {
      push(errors, `${path}.correctAnswer`, "correctAnswer must appear in options.");
    }
    if (typeof question.points !== "number" || question.points < 0) {
      push(errors, `${path}.points`, "points must be a non-negative number.");
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate decoder puzzle data.
 * @param {{puzzles?: unknown}} dataset
 */
export function validatePuzzles(dataset) {
  const errors = [];
  if (!dataset || !Array.isArray(dataset.puzzles)) {
    return {
      valid: false,
      errors: [{ path: "puzzles", message: "Dataset must contain a puzzles array." }],
    };
  }

  const seen = new Set();
  dataset.puzzles.forEach((puzzle, index) => {
    const path = `puzzles[${index}]`;
    if (!puzzle || typeof puzzle !== "object") {
      push(errors, path, "Puzzle must be an object.");
      return;
    }
    for (const field of ["id", "title", "artifactId", "encodedMessage", "correctAnswer"]) {
      if (!isNonEmptyString(puzzle[field])) {
        push(errors, `${path}.${field}`, "Required non-empty string.");
      }
    }
    if (seen.has(puzzle.id)) {
      push(errors, `${path}.id`, `Duplicate puzzle id "${puzzle.id}".`);
    }
    seen.add(puzzle.id);

    if (!PUZZLE_TYPES.includes(puzzle.type)) {
      push(errors, `${path}.type`, `Invalid puzzle type "${puzzle.type}".`);
    }
    if (!DIFFICULTIES.includes(puzzle.difficulty)) {
      push(errors, `${path}.difficulty`, `Invalid difficulty "${puzzle.difficulty}".`);
    }
    if (!isStringArray(puzzle.acceptedAnswers) || puzzle.acceptedAnswers.length === 0) {
      push(errors, `${path}.acceptedAnswers`, "At least one accepted answer is required.");
    }
    if (!isStringArray(puzzle.hints)) {
      push(errors, `${path}.hints`, "hints must be an array of strings.");
    }
    if (typeof puzzle.points !== "number" || puzzle.points <= 0) {
      push(errors, `${path}.points`, "points must be a positive number.");
    }
    if (typeof puzzle.maxAttempts !== "number" && puzzle.maxAttempts !== null) {
      push(errors, `${path}.maxAttempts`, "maxAttempts must be a number or null.");
    }
    if (puzzle.isSimulated !== true) {
      push(errors, `${path}.isSimulated`, "Puzzles must be flagged as simulated.");
    }
    if (puzzle.type === "caesar_cipher" && typeof puzzle.shift !== "number") {
      push(errors, `${path}.shift`, "Caesar puzzles require a numeric shift.");
    }
    if (
      puzzle.type === "letter_substitution" &&
      !isNonEmptyString(puzzle.cipherAlphabet)
    ) {
      push(errors, `${path}.cipherAlphabet`, "Substitution puzzles require a cipher alphabet.");
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate badge definitions.
 * @param {{badges?: unknown}} dataset
 */
export function validateBadges(dataset) {
  const errors = [];
  if (!dataset || !Array.isArray(dataset.badges)) {
    return {
      valid: false,
      errors: [{ path: "badges", message: "Dataset must contain a badges array." }],
    };
  }

  const seen = new Set();
  dataset.badges.forEach((badge, index) => {
    const path = `badges[${index}]`;
    if (!badge || typeof badge !== "object") {
      push(errors, path, "Badge must be an object.");
      return;
    }
    for (const field of ["id", "name", "description", "icon", "category"]) {
      if (!isNonEmptyString(badge[field])) {
        push(errors, `${path}.${field}`, "Required non-empty string.");
      }
    }
    if (seen.has(badge.id)) {
      push(errors, `${path}.id`, `Duplicate badge id "${badge.id}".`);
    }
    seen.add(badge.id);

    if (!RARITIES.includes(badge.rarity)) {
      push(errors, `${path}.rarity`, `Invalid rarity "${badge.rarity}".`);
    }
    if (typeof badge.points !== "number" || badge.points < 0) {
      push(errors, `${path}.points`, "points must be a non-negative number.");
    }

    const requirement = badge.requirement;
    if (!requirement || !REQUIREMENT_TYPES.includes(requirement.type)) {
      push(errors, `${path}.requirement`, "Invalid requirement definition.");
      return;
    }
    if (requirement.type === "count") {
      if (!isNonEmptyString(requirement.metric)) {
        push(errors, `${path}.requirement.metric`, "Count requirements need a metric.");
      }
      if (typeof requirement.target !== "number" || requirement.target <= 0) {
        push(errors, `${path}.requirement.target`, "Count requirements need a target.");
      }
    }
    if (requirement.type === "destination" && !DESTINATIONS.includes(requirement.destination)) {
      push(errors, `${path}.requirement.destination`, "Invalid destination requirement.");
    }
    if (requirement.type === "accuracy") {
      if (typeof requirement.target !== "number" || requirement.target <= 0 || requirement.target > 100) {
        push(errors, `${path}.requirement.target`, "Accuracy target must be 1-100.");
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
