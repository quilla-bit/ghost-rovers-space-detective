import { describe, expect, it, vi } from "vitest";
import { createProgressService } from "../services/progressService.js";
import { createStorageService } from "../services/storageService.js";
import { EVENTS } from "../utils/constants.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    map,
  };
}

function setup() {
  const storage = createMemoryStorage();
  const storageService = createStorageService({
    storage,
    now: () => new Date("2026-05-06T07:08:09Z"),
  });
  const service = createProgressService({
    storage: storageService,
    now: () => new Date("2026-05-06T07:08:09Z"),
  });
  return { service, storage, storageService };
}

const quizPayload = {
  sessionId: "quiz-1",
  score: 80,
  totalQuestions: 5,
  correctAnswers: 4,
  incorrectAnswers: 1,
  accuracy: 80,
  difficultyBreakdown: { beginner: { total: 5, correct: 4, incorrect: 1, points: 80 } },
};

describe("artifact exploration", () => {
  it("records an artifact once and awards the destination badge", () => {
    const { service } = setup();
    const report = service.recordEvent(EVENTS.ARTIFACT_EXPLORED, {
      artifactId: "mars_sojourner",
    });

    expect(report.applied).toBe(true);
    expect(service.getProgress().exploration.exploredArtifactIds).toEqual([
      "mars_sojourner",
    ]);
    expect(service.getProgress().statistics.artifactsExplored).toBe(1);
    expect(report.newlyUnlockedBadges.map((badge) => badge.id)).toEqual([
      "red_planet_detective",
    ]);
    // Badge points are added to the player's total.
    expect(service.getProgress().statistics.totalScore).toBe(25);
  });

  it("does not double count a repeat visit", () => {
    const { service } = setup();
    service.recordEvent(EVENTS.ARTIFACT_EXPLORED, { artifactId: "mars_sojourner" });
    const second = service.recordEvent(EVENTS.ARTIFACT_EXPLORED, {
      artifactId: "mars_sojourner",
    });

    expect(second.applied).toBe(false);
    expect(second.reason).toMatch(/already explored/i);
    expect(service.getProgress().statistics.artifactsExplored).toBe(1);
    expect(service.getProgress().achievements.unlockedBadgeIds).toEqual([
      "red_planet_detective",
    ]);
  });

  it("rejects unknown artifact ids", () => {
    const { service } = setup();
    const report = service.recordEvent(EVENTS.ARTIFACT_EXPLORED, {
      artifactId: "not-a-real-artifact",
    });
    expect(report.applied).toBe(false);
    expect(service.getProgress().exploration.exploredArtifactIds).toEqual([]);
  });
});

describe("quiz completion", () => {
  it("updates statistics, history and score", () => {
    const { service } = setup();
    service.recordEvent(EVENTS.QUIZ_COMPLETED, quizPayload);

    const progress = service.getProgress();
    expect(progress.statistics.quizzesCompleted).toBe(1);
    expect(progress.statistics.questionsAnswered).toBe(5);
    expect(progress.statistics.correctAnswers).toBe(4);
    expect(progress.statistics.incorrectAnswers).toBe(1);
    expect(progress.quizHistory).toHaveLength(1);
    expect(progress.statistics.totalScore).toBe(80 + 25 + 50); // quiz + First Steps + Sharp Mind
    expect(progress.achievements.unlockedBadgeIds).toEqual(
      expect.arrayContaining(["first_steps", "sharp_mind"]),
    );
  });

  it("records a given session only once", () => {
    const { service } = setup();
    service.recordEvent(EVENTS.QUIZ_COMPLETED, quizPayload);
    const duplicate = service.recordEvent(EVENTS.QUIZ_COMPLETED, quizPayload);

    expect(duplicate.applied).toBe(false);
    expect(service.getProgress().quizHistory).toHaveLength(1);
    expect(service.getProgress().statistics.quizzesCompleted).toBe(1);
  });

  it("unlocks Perfect Mission for a 100% quiz", () => {
    const { service } = setup();
    const report = service.recordEvent(EVENTS.QUIZ_COMPLETED, {
      ...quizPayload,
      sessionId: "quiz-perfect",
      score: 100,
      correctAnswers: 5,
      incorrectAnswers: 0,
      accuracy: 100,
    });
    expect(report.newlyUnlockedBadges.map((badge) => badge.id)).toContain(
      "perfect_mission",
    );
  });
});

describe("decoder completion", () => {
  it("records a solved puzzle once", () => {
    const { service } = setup();
    const payload = {
      puzzleId: "decoder_phoenix_water",
      difficulty: "beginner",
      solved: true,
      attempts: 1,
      hintsUsed: 0,
      score: 20,
    };
    service.recordEvent(EVENTS.DECODER_COMPLETED, payload);
    const duplicate = service.recordEvent(EVENTS.DECODER_COMPLETED, payload);

    expect(duplicate.applied).toBe(false);
    expect(duplicate.reason).toMatch(/already completed/i);
    const progress = service.getProgress();
    expect(progress.decoderHistory).toHaveLength(1);
    expect(progress.statistics.decoderPuzzlesCompleted).toBe(1);
    expect(progress.achievements.unlockedBadgeIds).toContain("decoder_rookie");
  });

  it("unlocks Code Breaker after five distinct puzzles", () => {
    const { service } = setup();
    for (let index = 1; index <= 5; index += 1) {
      service.recordEvent(EVENTS.DECODER_COMPLETED, {
        puzzleId: `puzzle-${index}`,
        difficulty: "beginner",
        solved: true,
        attempts: 1,
        hintsUsed: 0,
        score: 20,
      });
    }
    expect(service.getProgress().achievements.unlockedBadgeIds).toContain(
      "code_breaker",
    );
  });

  it("records a failed attempt without score or completion credit", () => {
    const { service } = setup();
    service.recordEvent(EVENTS.DECODER_COMPLETED, {
      puzzleId: "decoder_eagle_number",
      solved: false,
      attempts: 3,
      score: 0,
    });
    const progress = service.getProgress();
    expect(progress.decoderHistory).toHaveLength(1);
    expect(progress.decoderHistory[0].solved).toBe(false);
    expect(progress.statistics.decoderPuzzlesCompleted).toBe(0);
    expect(progress.statistics.totalScore).toBe(0);
  });
});

describe("persistence and subscribers", () => {
  it("persists after each event and restores on a new service", () => {
    const storage = createMemoryStorage();
    const storageService = createStorageService({ storage });
    const service = createProgressService({ storage: storageService });

    service.recordEvent(EVENTS.ARTIFACT_EXPLORED, { artifactId: "voyager1" });
    service.recordEvent(EVENTS.QUIZ_COMPLETED, quizPayload);

    const restored = createProgressService({
      storage: createStorageService({ storage }),
    });
    expect(restored.getProgress().statistics.quizzesCompleted).toBe(1);
    expect(restored.getProgress().exploration.exploredArtifactIds).toEqual(["voyager1"]);
    expect(restored.getProgress().achievements.unlockedBadgeIds).toContain(
      "deep_space_traveler",
    );
  });

  it("notifies subscribers with the new state", () => {
    const { service } = setup();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    service.recordEvent(EVENTS.ARTIFACT_EXPLORED, { artifactId: "apollo11_lm_eagle" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].progress.statistics.artifactsExplored).toBe(1);

    unsubscribe();
    service.recordEvent(EVENTS.ARTIFACT_EXPLORED, { artifactId: "mars_spirit" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("survives a throwing subscriber", () => {
    const { service } = setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    service.subscribe(() => {
      throw new Error("boom");
    });
    expect(() =>
      service.recordEvent(EVENTS.ARTIFACT_EXPLORED, { artifactId: "apollo11_lm_eagle" }),
    ).not.toThrow();
    expect(service.getProgress().statistics.artifactsExplored).toBe(1);
    spy.mockRestore();
  });

  it("resets to defaults and notifies", () => {
    const { service } = setup();
    service.recordEvent(EVENTS.ARTIFACT_EXPLORED, { artifactId: "apollo11_lm_eagle" });
    const listener = vi.fn();
    service.subscribe(listener);

    const { progress } = service.resetProgress();
    expect(progress.statistics.totalScore).toBe(0);
    expect(progress.achievements.unlockedBadgeIds).toEqual([]);
    expect(progress.exploration.exploredArtifactIds).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("records quiz-started events without inventing statistics", () => {
    const { service } = setup();
    const report = service.recordEvent(EVENTS.QUIZ_STARTED, {});
    expect(report.applied).toBe(true);
    expect(service.getProgress().statistics.quizzesCompleted).toBe(0);
    expect(service.getProgress().player.lastPlayed).toBe("2026-05-06T07:08:09.000Z");
  });
});
