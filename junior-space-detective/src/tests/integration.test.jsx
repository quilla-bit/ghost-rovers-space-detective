import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { createProgressService } from "../services/progressService.js";
import { createStorageService } from "../services/storageService.js";
import { STORAGE_KEY } from "../utils/constants.js";
import puzzlesData from "../data/decoderPuzzles.json";

/** In-memory Storage so tests never touch the real localStorage. */
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    dump: () => map.get(STORAGE_KEY),
  };
}

function setup() {
  const storage = createMemoryStorage();
  const service = createProgressService({
    storage: createStorageService({ storage }),
  });
  const user = userEvent.setup();
  const view = render(<App service={service} />);
  return { storage, service, user, ...view };
}

describe("application shell", () => {
  it("renders the dashboard and navigates between pages", async () => {
    const { user } = setup();

    expect(
      screen.getByRole("heading", { name: /abandoned, but not forgotten/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/your mission record/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Artifact Explorer" }));
    expect(
      screen.getByRole("heading", { name: "Artifact Explorer", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Explorer Profile" }));
    expect(
      screen.getByRole("heading", { name: /junior space detective/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("marks the active navigation item with aria-current", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Detective Quiz" }));
    expect(screen.getByRole("button", { name: "Detective Quiz" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("artifact exploration journey", () => {
  it("records an artifact, awards a badge and persists across a reload", async () => {
    const { storage, service, user, unmount } = setup();

    await user.click(screen.getByRole("button", { name: "Artifact Explorer" }));
    await user.click(screen.getByRole("button", { name: /open artifact file: sojourner/i }));

    expect(
      screen.getByRole("heading", { name: /sojourner/i, level: 1 }),
    ).toBeInTheDocument();
    expect(service.getProgress().exploration.exploredArtifactIds).toEqual([
      "mars_sojourner",
    ]);
    expect(service.getProgress().achievements.unlockedBadgeIds).toContain(
      "red_planet_detective",
    );

    // Saved JSON exists and contains the exploration record.
    expect(storage.dump()).toContain("mars_sojourner");

    unmount();
    const restoredService = createProgressService({
      storage: createStorageService({ storage }),
    });
    render(<App service={restoredService} />);
    expect(restoredService.getProgress().exploration.exploredArtifactIds).toEqual([
      "mars_sojourner",
    ]);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("does not count the same artifact twice", async () => {
    const { service, user } = setup();
    await user.click(screen.getByRole("button", { name: "Artifact Explorer" }));

    await user.click(screen.getByRole("button", { name: /open artifact file: sojourner/i }));
    await user.click(screen.getByRole("button", { name: /back to all artifacts/i }));
    await user.click(screen.getByRole("button", { name: /open artifact file: sojourner/i }));

    expect(service.getProgress().exploration.exploredArtifactIds).toHaveLength(1);
    expect(service.getProgress().statistics.artifactsExplored).toBe(1);
  });
});

describe("quiz journey", () => {
  it("runs a quiz to completion, records it once and unlocks First Steps", async () => {
    const { service, user, container } = setup();

    await user.click(screen.getByRole("button", { name: "Detective Quiz" }));
    await user.selectOptions(screen.getByLabelText(/number of questions/i), "3");
    await user.click(screen.getByRole("button", { name: /start the quiz/i }));

    for (let index = 0; index < 3; index += 1) {
      const options = container.querySelectorAll(".option-button:not([disabled])");
      expect(options.length).toBeGreaterThan(0);
      await user.click(options[0]);
      await user.click(screen.getByRole("button", { name: /submit answer/i }));

      expect(screen.getByText(/not quite|correct/i)).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: /next question|see debrief/i }),
      );
    }

    expect(
      screen.getByRole("heading", { name: /quiz complete/i }),
    ).toBeInTheDocument();

    const progress = service.getProgress();
    expect(progress.statistics.quizzesCompleted).toBe(1);
    expect(progress.statistics.questionsAnswered).toBe(3);
    expect(progress.quizHistory).toHaveLength(1);
    expect(progress.achievements.unlockedBadgeIds).toContain("first_steps");
  });

  it("does not reveal answer options as pre-selected", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Detective Quiz" }));
    await user.click(screen.getByRole("button", { name: /start the quiz/i }));

    const options = document.querySelectorAll(".option-button");
    options.forEach((option) => {
      expect(option).toHaveAttribute("aria-pressed", "false");
    });
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeDisabled();
  });
});

describe("decoder journey", () => {
  it("solves a puzzle, records it and finishes the run", async () => {
    const { service, user, container } = setup();

    await user.click(screen.getByRole("button", { name: "Decoder" }));
    await user.selectOptions(screen.getByLabelText(/puzzles in this run/i), "1");
    await user.click(screen.getByRole("button", { name: /start decoding/i }));

    const encoded = container.querySelector(".encoded-message").textContent.trim();
    const puzzle = puzzlesData.puzzles.find((entry) => entry.encodedMessage === encoded);
    expect(puzzle).toBeDefined();

    await user.type(
      screen.getByLabelText(/your decoded answer/i),
      puzzle.correctAnswer,
    );
    await user.click(screen.getByRole("button", { name: /^decode$/i }));

    expect(screen.getByText(/transmission decoded/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /finish run/i }));
    expect(
      screen.getByRole("heading", { name: /decoder run finished/i }),
    ).toBeInTheDocument();

    const progress = service.getProgress();
    expect(progress.statistics.decoderPuzzlesCompleted).toBe(1);
    expect(progress.decoderHistory).toHaveLength(1);
    expect(progress.decoderHistory[0].puzzleId).toBe(puzzle.id);
    expect(progress.statistics.totalScore).toBeGreaterThanOrEqual(puzzle.points);
  });

  it("shows a hint only after the player asks for it", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Decoder" }));
    await user.selectOptions(screen.getByLabelText(/puzzles in this run/i), "1");
    await user.click(screen.getByRole("button", { name: /start decoding/i }));

    expect(screen.queryByLabelText(/revealed hints/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reveal hint/i }));
    expect(screen.getByLabelText(/revealed hints/i)).toBeInTheDocument();
  });
});

describe("profile", () => {
  it("shows accumulated statistics and resets progress", async () => {
    const { service, user } = setup();
    await user.click(screen.getByRole("button", { name: "Artifact Explorer" }));
    await user.click(screen.getByRole("button", { name: /open artifact file: sojourner/i }));
    await user.click(screen.getByRole("button", { name: "Explorer Profile" }));

    expect(screen.getByText(/achievement collection/i)).toBeInTheDocument();
    expect(screen.getAllByText(/red planet detective/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /reset progress/i }));
    await user.click(screen.getByRole("button", { name: /yes, reset my progress/i }));

    expect(service.getProgress().statistics.totalScore).toBe(0);
    expect(service.getProgress().exploration.exploredArtifactIds).toEqual([]);
  });
});
