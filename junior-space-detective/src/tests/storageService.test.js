import { describe, expect, it } from "vitest";
import {
  createDefaultProgress,
  createStorageService,
  validateStoredProgress,
} from "../services/storageService.js";
import { SCHEMA_VERSION, STORAGE_KEY } from "../utils/constants.js";

/** Minimal in-memory Storage implementation. */
function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    raw: (key) => map.get(key),
    size: () => map.size,
  };
}

const now = () => new Date("2026-04-05T06:07:08Z");

function makeService(storage) {
  const warnings = [];
  const service = createStorageService({
    storage,
    now,
    onWarning: (message) => warnings.push(message),
  });
  return { service, warnings };
}

describe("createDefaultProgress", () => {
  it("matches the documented schema", () => {
    const progress = createDefaultProgress(now);
    expect(progress.version).toBe(SCHEMA_VERSION);
    expect(progress.player).toMatchObject({ id: "local-player" });
    expect(progress.statistics.totalScore).toBe(0);
    expect(progress.exploration.exploredArtifactIds).toEqual([]);
    expect(progress.achievements.unlockedBadgeIds).toEqual([]);
    expect(progress.quizHistory).toEqual([]);
    expect(progress.decoderHistory).toEqual([]);
  });
});

describe("loadProgress", () => {
  it("returns defaults when nothing is stored", () => {
    const { service } = makeService(createMemoryStorage());
    const progress = service.loadProgress();
    expect(progress.statistics.totalScore).toBe(0);
    expect(progress.player.createdAt).toBe("2026-04-05T06:07:08.000Z");
  });

  it("returns defaults when storage is unavailable", () => {
    const { service } = makeService(null);
    expect(service.isAvailable()).toBe(false);
    expect(service.loadProgress().version).toBe(SCHEMA_VERSION);
    expect(service.saveProgress(createDefaultProgress(now)).saved).toBe(false);
  });

  it("recovers from malformed JSON with a warning", () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: "{not json" });
    const { service, warnings } = makeService(storage);
    const progress = service.loadProgress();
    expect(progress.statistics.totalScore).toBe(0);
    expect(warnings.join(" ")).toMatch(/valid JSON/i);
  });

  it("repairs missing fields and outdated versions", () => {
    const stored = JSON.stringify({
      version: 0,
      statistics: { totalScore: 40 },
      exploration: { exploredArtifactIds: ["a", "a", 7] },
      achievements: { unlockedBadgeIds: ["first_steps", "first_steps"] },
    });
    const storage = createMemoryStorage({ [STORAGE_KEY]: stored });
    const { service, warnings } = makeService(storage);

    const progress = service.loadProgress();
    expect(progress.version).toBe(SCHEMA_VERSION);
    expect(progress.statistics.totalScore).toBe(40);
    expect(progress.statistics.quizzesCompleted).toBe(0);
    expect(progress.exploration.exploredArtifactIds).toEqual(["a"]);
    expect(progress.achievements.unlockedBadgeIds).toEqual(["first_steps"]);
    expect(progress.player.id).toBe("local-player");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("recomputes derived counters instead of trusting stored values", () => {
    const stored = JSON.stringify({
      version: 1,
      statistics: { artifactsExplored: 99, decoderPuzzlesCompleted: 42 },
      exploration: { exploredArtifactIds: ["x", "y"] },
      decoderHistory: [
        { puzzleId: "p1", solved: true, score: 20 },
        { puzzleId: "p1", solved: true, score: 20 },
        { puzzleId: "p2", solved: false, score: 0 },
      ],
    });
    const { service } = makeService(createMemoryStorage({ [STORAGE_KEY]: stored }));
    const progress = service.loadProgress();
    expect(progress.statistics.artifactsExplored).toBe(2);
    expect(progress.statistics.decoderPuzzlesCompleted).toBe(1);
  });
});

describe("saveProgress and updateProgress", () => {
  it("round-trips progress", () => {
    const storage = createMemoryStorage();
    const { service } = makeService(storage);
    const progress = createDefaultProgress(now);
    progress.statistics.totalScore = 120;
    progress.statistics.quizzesCompleted = 2;
    progress.exploration.exploredArtifactIds = ["mars_sojourner"];

    expect(service.saveProgress(progress).saved).toBe(true);

    const reloaded = service.loadProgress();
    expect(reloaded.statistics.totalScore).toBe(120);
    expect(reloaded.exploration.exploredArtifactIds).toEqual(["mars_sojourner"]);
  });

  it("skips identical writes", () => {
    const { service } = makeService(createMemoryStorage());
    const progress = createDefaultProgress(now);
    service.saveProgress(progress);
    const before = service.getWriteCount();
    service.saveProgress(progress);
    service.saveProgress(progress);
    expect(service.getWriteCount()).toBe(before);
  });

  it("updates through a function and persists the result", () => {
    const { service } = makeService(createMemoryStorage());
    const { progress } = service.updateProgress((current) => ({
      ...current,
      statistics: { ...current.statistics, totalScore: 55 },
    }));
    expect(progress.statistics.totalScore).toBe(55);
    expect(service.loadProgress().statistics.totalScore).toBe(55);
  });

  it("reports a quota-style failure without throwing", () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const { service, warnings } = makeService(storage);
    const outcome = service.saveProgress(createDefaultProgress(now));
    expect(outcome.saved).toBe(false);
    expect(outcome.error).toMatch(/could not save/i);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("clearProgress", () => {
  it("removes the saved record", () => {
    const storage = createMemoryStorage();
    const { service } = makeService(storage);
    service.saveProgress({ ...createDefaultProgress(now), statistics: { totalScore: 5 } });
    expect(storage.raw(STORAGE_KEY)).toBeTruthy();

    expect(service.clearProgress().cleared).toBe(true);
    expect(storage.raw(STORAGE_KEY)).toBeUndefined();
    expect(service.loadProgress().statistics.totalScore).toBe(0);
  });
});

describe("validateStoredProgress", () => {
  it("rejects non-objects and clamps negative numbers", () => {
    expect(validateStoredProgress(null, now).valid).toBe(false);

    const result = validateStoredProgress(
      {
        version: 1,
        statistics: { totalScore: -50, quizzesCompleted: "2" },
      },
      now,
    );
    expect(result.progress.statistics.totalScore).toBe(0);
    expect(result.progress.statistics.quizzesCompleted).toBe(2);
  });
});
