import { describe, expect, it } from "vitest";
import artifactsData from "../data/artifacts.json";
import questionsData from "../data/quizQuestions.json";
import puzzlesData from "../data/decoderPuzzles.json";
import badgesData from "../data/badges.json";
import {
  validateArtifacts,
  validateBadges,
  validatePuzzles,
  validateQuestions,
} from "../utils/validation.js";
import { DESTINATIONS, DIFFICULTIES, ARTIFACT_STATUSES } from "../utils/constants.js";

describe("artifact dataset", () => {
  const { artifacts } = artifactsData;
  const ids = artifacts.map((artifact) => artifact.id);

  it("parses and passes schema validation", () => {
    const result = validateArtifacts(artifactsData);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("contains a useful number of artifacts", () => {
    expect(artifacts.length).toBeGreaterThanOrEqual(15);
    expect(artifacts.length).toBeLessThanOrEqual(30);
  });

  it("has unique artifact ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all three destinations", () => {
    for (const destination of DESTINATIONS) {
      expect(artifacts.some((artifact) => artifact.destination === destination)).toBe(
        true,
      );
    }
  });

  it("only uses vocabulary values from constants", () => {
    for (const artifact of artifacts) {
      expect(DESTINATIONS).toContain(artifact.destination);
      expect(DIFFICULTIES).toContain(artifact.difficulty);
      expect(ARTIFACT_STATUSES).toContain(artifact.status);
    }
  });

  it("gives every artifact NASA sources with https URLs", () => {
    for (const artifact of artifacts) {
      expect(artifact.sources.length).toBeGreaterThan(0);
      for (const source of artifact.sources) {
        expect(source.url.startsWith("https://")).toBe(true);
        expect(source.publisher.toLowerCase()).toContain("nasa");
      }
    }
  });

  it("only links to artifacts that exist", () => {
    for (const artifact of artifacts) {
      for (const relatedId of artifact.relatedArtifacts) {
        expect(ids).toContain(relatedId);
        expect(relatedId).not.toBe(artifact.id);
      }
    }
  });

  it("keeps quizQuestionIds consistent with the question bank in both directions", () => {
    const { questions } = questionsData;
    for (const artifact of artifacts) {
      const linkedQuestionIds = questions
        .filter((question) => question.artifactId === artifact.id)
        .map((question) => question.id);
      expect(artifact.quizQuestionIds).toEqual(linkedQuestionIds);
    }
  });

  it("does not claim images that do not exist", () => {
    for (const artifact of artifacts) {
      expect(artifact.image).toBeNull();
    }
  });

  it("has no fabricated 'operational' status for finished planetary missions", () => {
    const spirit = artifacts.find((artifact) => artifact.id === "mars_spirit");
    expect(spirit.status).toBe("inactive");
    const voyager = artifacts.find((artifact) => artifact.id === "voyager1");
    expect(voyager.status).toBe("operational");
  });
});

describe("quiz question dataset", () => {
  it("passes schema validation", () => {
    expect(validateQuestions(questionsData).errors).toEqual([]);
  });

  it("references only real artifacts", () => {
    const artifactIds = new Set(artifactsData.artifacts.map((artifact) => artifact.id));
    for (const question of questionsData.questions) {
      expect(artifactIds.has(question.artifactId)).toBe(true);
    }
  });

  it("has unique question ids", () => {
    const ids = questionsData.questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("awards points that match the difficulty table", () => {
    const expected = { beginner: 10, intermediate: 20, advanced: 30 };
    for (const question of questionsData.questions) {
      expect(question.points).toBe(expected[question.difficulty]);
    }
  });

  it("uses varied question formats", () => {
    const types = new Set(questionsData.questions.map((question) => question.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });
});

describe("decoder puzzle dataset", () => {
  it("passes schema validation", () => {
    expect(validatePuzzles(puzzlesData).errors).toEqual([]);
  });

  it("labels every puzzle as simulated", () => {
    for (const puzzle of puzzlesData.puzzles) {
      expect(puzzle.isSimulated).toBe(true);
    }
    expect(puzzlesData.notice.toLowerCase()).toContain("fictional");
  });

  it("has at least one hint and a positive score per puzzle", () => {
    for (const puzzle of puzzlesData.puzzles) {
      expect(puzzle.hints.length).toBeGreaterThan(0);
      expect(puzzle.points).toBeGreaterThan(0);
    }
  });
});

describe("badge dataset", () => {
  it("passes schema validation", () => {
    expect(validateBadges(badgesData).errors).toEqual([]);
  });

  it("contains exactly one mastery badge", () => {
    const mastery = badgesData.badges.filter(
      (badge) => badge.requirement.type === "all_badges",
    );
    expect(mastery).toHaveLength(1);
    expect(mastery[0].id).toBe("space_expert");
  });

  it("includes every badge required by the brief", () => {
    const required = [
      "first_steps",
      "moon_explorer",
      "red_planet_detective",
      "deep_space_traveler",
      "sharp_mind",
      "decoder_rookie",
      "code_breaker",
      "nasa_historian",
      "perfect_mission",
      "space_expert",
    ];
    const ids = badgesData.badges.map((badge) => badge.id);
    for (const id of required) expect(ids).toContain(id);
  });
});
