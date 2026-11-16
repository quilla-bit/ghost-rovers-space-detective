import artifactsData from "../data/artifacts.json";
import quizQuestionsData from "../data/quizQuestions.json";
import decoderPuzzlesData from "../data/decoderPuzzles.json";
import { DESTINATIONS, DIFFICULTIES } from "../utils/constants.js";

/**
 * Read-only access to the NASA artifact dataset plus its quiz and puzzle
 * links. Keeping lookups here means components never import JSON directly.
 */

const artifacts = Array.isArray(artifactsData.artifacts) ? artifactsData.artifacts : [];
const questions = Array.isArray(quizQuestionsData.questions)
  ? quizQuestionsData.questions
  : [];
const puzzles = Array.isArray(decoderPuzzlesData.puzzles) ? decoderPuzzlesData.puzzles : [];

const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
const questionsByArtifact = new Map();
for (const question of questions) {
  if (!questionsByArtifact.has(question.artifactId)) {
    questionsByArtifact.set(question.artifactId, []);
  }
  questionsByArtifact.get(question.artifactId).push(question);
}

/** All artifacts, in dataset order. */
export function getAllArtifacts() {
  return artifacts;
}

/**
 * @param {string} id
 * @returns {Object|null}
 */
export function getArtifactById(id) {
  return artifactById.get(id) || null;
}

/**
 * Filter and search artifacts.
 *
 * @param {Object} [filters]
 * @param {string} [filters.destination] - "Moon" | "Mars" | "Deep Space" | "all"
 * @param {string} [filters.difficulty] - "beginner" | ... | "all"
 * @param {string} [filters.search] - free text
 * @param {string} [filters.status]
 * @returns {Array<Object>}
 */
export function getArtifacts(filters = {}) {
  const { destination = "all", difficulty = "all", search = "", status = "all" } = filters;
  const query = String(search || "").trim().toLowerCase();

  return artifacts.filter((artifact) => {
    if (destination !== "all" && artifact.destination !== destination) return false;
    if (difficulty !== "all" && artifact.difficulty !== difficulty) return false;
    if (status !== "all" && artifact.status !== status) return false;
    if (!query) return true;

    const haystack = [
      artifact.name,
      artifact.category,
      artifact.mission,
      artifact.agency,
      artifact.destination,
      artifact.educationalSummary,
      artifact.historicalSignificance,
      artifact.locationDescription,
      ...(artifact.missionObjective || []),
      ...(artifact.scientificDiscoveries || []),
      ...(artifact.funFacts || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

/**
 * Related artifact records, following curated ids and falling back to
 * same-destination artifacts so the detail view is never empty.
 * @param {string} id
 */
export function getRelatedArtifacts(id) {
  const artifact = getArtifactById(id);
  if (!artifact) return [];
  const explicit = (artifact.relatedArtifacts || [])
    .map((relatedId) => artifactById.get(relatedId))
    .filter(Boolean);
  if (explicit.length >= 2) return explicit.slice(0, 3);
  const extras = artifacts
    .filter(
      (candidate) =>
        candidate.id !== id &&
        candidate.destination === artifact.destination &&
        !explicit.some((related) => related.id === candidate.id),
    )
    .slice(0, 3 - explicit.length);
  return [...explicit, ...extras];
}

/**
 * Quiz questions linked to an artifact.
 * @param {string} artifactId
 */
export function getQuestionsForArtifact(artifactId) {
  return questionsByArtifact.get(artifactId) || [];
}

/** All quiz questions. */
export function getAllQuestions() {
  return questions;
}

/** All decoder puzzles. */
export function getAllPuzzles() {
  return puzzles;
}

/**
 * @param {string} puzzleId
 */
export function getPuzzleById(puzzleId) {
  return puzzles.find((puzzle) => puzzle.id === puzzleId) || null;
}

/**
 * Counts per destination, used by the dashboard and filters.
 * @returns {Record<string, number>}
 */
export function getDestinationCounts() {
  const counts = { all: artifacts.length };
  for (const destination of DESTINATIONS) counts[destination] = 0;
  for (const artifact of artifacts) {
    if (counts[artifact.destination] !== undefined) counts[artifact.destination] += 1;
  }
  return counts;
}

/**
 * Difficulty values present in the dataset.
 */
export function getAvailableDifficulties() {
  const present = new Set(artifacts.map((artifact) => artifact.difficulty));
  return DIFFICULTIES.filter((difficulty) => present.has(difficulty));
}

/**
 * Lightweight index for the badge engine.
 */
export function getArtifactIndex() {
  return artifacts.map(({ id, destination, name, difficulty, status }) => ({
    id,
    destination,
    name,
    difficulty,
    status,
  }));
}

/**
 * Statistics used in the interface copy.
 */
export function getDatasetSummary() {
  return {
    artifactCount: artifacts.length,
    questionCount: questions.length,
    puzzleCount: puzzles.length,
    destinationCounts: getDestinationCounts(),
  };
}

export { artifactsData, quizQuestionsData, decoderPuzzlesData };
