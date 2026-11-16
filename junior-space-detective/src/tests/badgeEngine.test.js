import { describe, expect, it } from "vitest";
import {
  buildMetrics,
  countUnlockedBadges,
  evaluateBadges,
  evaluateRequirement,
  getBadgePoints,
} from "../engines/badgeEngine.js";
import badgesData from "../data/badges.json";
import artifactsData from "../data/artifacts.json";

const badges = badgesData.badges;
const artifacts = artifactsData.artifacts.map(({ id, destination }) => ({
  id,
  destination,
}));

const now = () => new Date("2026-03-04T05:06:07Z");

function progressFixture(overrides = {}) {
  return {
    version: 1,
    player: { id: "local-player", createdAt: null, lastPlayed: null },
    statistics: {
      totalScore: 0,
      quizzesCompleted: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      decoderPuzzlesCompleted: 0,
      artifactsExplored: 0,
    },
    exploration: { exploredArtifactIds: [] },
    achievements: { unlockedBadgeIds: [], unlockHistory: [] },
    quizHistory: [],
    decoderHistory: [],
    ...overrides,
  };
}

describe("buildMetrics", () => {
  it("counts unique explored artifacts by destination", () => {
    const progress = progressFixture({
      exploration: {
        exploredArtifactIds: [
          "apollo11_lm_eagle",
          "apollo11_lm_eagle",
          "mars_sojourner",
          "voyager1",
          "unknown-id",
        ],
      },
    });
    const metrics = buildMetrics(progress, artifacts);
    expect(metrics.artifactsExplored).toBe(4);
    expect(metrics.moonArtifactsExplored).toBe(1);
    expect(metrics.marsArtifactsExplored).toBe(1);
    expect(metrics.deepSpaceArtifactsExplored).toBe(1);
    expect(metrics.destinations.sort()).toEqual(["Deep Space", "Mars", "Moon"]);
  });

  it("derives best accuracy and perfect quiz counts from history", () => {
    const progress = progressFixture({
      quizHistory: [
        { sessionId: "a", accuracy: 60 },
        { sessionId: "b", accuracy: 100 },
        { sessionId: "c", accuracy: 80 },
      ],
    });
    const metrics = buildMetrics(progress, artifacts);
    expect(metrics.bestQuizAccuracy).toBe(100);
    expect(metrics.perfectQuizzes).toBe(1);
  });

  it("returns zeros for an empty progress record", () => {
    const metrics = buildMetrics(progressFixture(), artifacts);
    expect(metrics.artifactsExplored).toBe(0);
    expect(metrics.bestQuizAccuracy).toBe(0);
    expect(metrics.destinations).toEqual([]);
  });
});

describe("evaluateRequirement", () => {
  const metrics = {
    quizzesCompleted: 2,
    artifactsExplored: 10,
    decoderPuzzlesCompleted: 5,
    bestQuizAccuracy: 90,
    destinations: ["Moon", "Mars"],
  };

  it(" evaluates count requirements", () => {
    expect(
      evaluateRequirement(
        { type: "count", metric: "decoderPuzzlesCompleted", target: 5 },
        metrics,
        [],
        badges,
      ).satisfied,
    ).toBe(true);
    expect(
      evaluateRequirement(
        { type: "count", metric: "decoderPuzzlesCompleted", target: 6 },
        metrics,
        [],
        badges,
      ).satisfied,
    ).toBe(false);
  });

  it("evaluates destination requirements", () => {
    expect(
      evaluateRequirement(
        { type: "destination", destination: "Moon" },
        metrics,
        [],
        badges,
      ).satisfied,
    ).toBe(true);
    expect(
      evaluateRequirement(
        { type: "destination", destination: "Deep Space" },
        metrics,
        [],
        badges,
      ).satisfied,
    ).toBe(false);
  });

  it("evaluates accuracy requirements and requires a completed quiz", () => {
    expect(
      evaluateRequirement({ type: "accuracy", target: 80 }, metrics, [], badges)
        .satisfied,
    ).toBe(true);
    expect(
      evaluateRequirement(
        { type: "accuracy", target: 80 },
        { ...metrics, quizzesCompleted: 0 },
        [],
        badges,
      ).satisfied,
    ).toBe(false);
  });

  it("evaluates mastery against every other badge", () => {
    const allButMastery = badges
      .filter((badge) => badge.requirement.type !== "all_badges")
      .map((badge) => badge.id);
    expect(
      evaluateRequirement(
        { type: "all_badges" },
        metrics,
        allButMastery,
        badges,
      ).satisfied,
    ).toBe(true);
    expect(
      evaluateRequirement(
        { type: "all_badges" },
        metrics,
        allButMastery.slice(1),
        badges,
      ).satisfied,
    ).toBe(false);
  });
});

describe("evaluateBadges", () => {
  it("unlocks First Steps after a quiz and stamps the time", () => {
    const metrics = buildMetrics(
      progressFixture({ statistics: { ...progressFixture().statistics, quizzesCompleted: 1 } }),
      artifacts,
    );
    const { newlyUnlocked } = evaluateBadges({ badges, metrics, now });
    const ids = newlyUnlocked.map((badge) => badge.id);
    expect(ids).toContain("first_steps");
    expect(newlyUnlocked[0].unlockedAt).toBe("2026-03-04T05:06:07.000Z");
  });

  it("unlocks multiple badges in a single pass", () => {
    const progress = progressFixture({
      exploration: {
        exploredArtifactIds: ["apollo11_lm_eagle", "mars_sojourner", "voyager1"],
      },
    });
    const metrics = buildMetrics(progress, artifacts);
    const { newlyUnlocked } = evaluateBadges({ badges, metrics, now });
    const ids = newlyUnlocked.map((badge) => badge.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "moon_explorer",
        "red_planet_detective",
        "deep_space_traveler",
      ]),
    );
  });

  it("never awards the same badge twice", () => {
    const metrics = buildMetrics(progressFixture(), artifacts);
    const first = evaluateBadges({
      badges,
      metrics: { ...metrics, quizzesCompleted: 1 },
      now,
    });
    expect(first.newlyUnlocked.map((badge) => badge.id)).toContain("first_steps");

    const second = evaluateBadges({
      badges,
      metrics: { ...metrics, quizzesCompleted: 1 },
      unlockedBadgeIds: ["first_steps"],
      now,
    });
    expect(second.newlyUnlocked.map((badge) => badge.id)).not.toContain("first_steps");
  });

  it("unlocks Space Expert only when every other badge is unlocked", () => {
    const metrics = buildMetrics(progressFixture(), artifacts);
    const almost = badges
      .filter((badge) => badge.requirement.type !== "all_badges")
      .map((badge) => badge.id)
      .slice(0, -1);
    const partial = evaluateBadges({
      badges,
      metrics,
      unlockedBadgeIds: almost,
      now,
    });
    expect(partial.newlyUnlocked.map((badge) => badge.id)).not.toContain("space_expert");

    const everythingElse = badges
      .filter((badge) => badge.requirement.type !== "all_badges")
      .map((badge) => badge.id);
    const complete = evaluateBadges({
      badges,
      metrics,
      unlockedBadgeIds: everythingElse,
      now,
    });
    expect(complete.newlyUnlocked.map((badge) => badge.id)).toContain("space_expert");
  });

  it("reports capped progress for locked badges", () => {
    const metrics = buildMetrics(
      progressFixture({ exploration: { exploredArtifactIds: ["apollo11_lm_eagle"] } }),
      artifacts,
    );
    const { progress } = evaluateBadges({ badges, metrics, now });
    const historian = progress.find((entry) => entry.badgeId === "nasa_historian");
    expect(historian.unlocked).toBe(false);
    expect(historian.current).toBe(1);
    expect(historian.target).toBe(10);
    expect(historian.percent).toBe(10);
  });

  it("counts and totals badge points", () => {
    const progress = progressFixture({
      achievements: { unlockedBadgeIds: ["first_steps", "moon_explorer"], unlockHistory: [] },
    });
    expect(countUnlockedBadges(progress)).toBe(2);
    expect(getBadgePoints(progress, badges)).toBe(50);
  });
});
