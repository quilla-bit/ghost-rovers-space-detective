# Integration Guide

How the four systems connect, and how to extend or embed the experience.

## Composition root

`src/main.jsx` mounts `App`. `App` owns navigation, the progress subscription and badge
toasts:

```jsx
<App service={progressServiceSingleton} />
```

The optional `service` prop exists so tests (and future embeds) can inject an isolated
progress store with an in-memory backend:

```jsx
const service = createProgressService({
  storage: createStorageService({ storage: myMemoryStorage }),
});
render(<App service={service} />);
```

## Player journey (verified by `integration.test.jsx`)

```
open app
  → load saved progress (storageService via progressService)
  → explore an artifact
      → record ARTIFACT_EXPLORED
      → evaluate badges → maybe unlock Moon/Mars/Deep Space badge
      → save → toast + header counter update
  → start quiz → submit answers → completion
      → record QUIZ_COMPLETED once (sessionId guard)
      → evaluate badges (First Steps, Sharp Mind, Perfect Mission)
      → save
  → start decoder → solve puzzle
      → record DECODER_COMPLETED once (puzzleId guard)
      → evaluate badges (Decoder Rookie, Code Breaker)
      → save
  → explorer profile reflects every statistic
  → refresh: progress restored from localStorage
  → reset: defaults restored and persisted
```

## What each page receives

| Page | Props |
| --- | --- |
| `Home` | `statistics`, `metrics`, `badgeProgress`, `onNavigate` |
| `ArtifactExplorer` | `exploredArtifactIds`, `onExplore`, `onNavigate` |
| `DetectiveQuiz` | `onResults`, `onNavigate` |
| `DecoderGame` | `onPuzzleResult`, `onNavigate` |
| `ExplorerProfile` | `progress`, `statistics`, `metrics`, `badgeProgress`, `onReset`, `onNavigate` |

Pages never write storage, never read engine internals beyond the hook API, and never
import data JSON directly (they use `artifactService`).

## Adding a new activity type

1. Add the event name to `EVENTS` in `src/utils/constants.js`.
2. Handle it in `progressService.recordEvent`:
   - mutate an immutable copy of the relevant statistics/history;
   - keep it idempotent.
3. Badge evaluation runs automatically after any applied event.
4. Expose an action in `usePlayerProgress` if the UI needs it.
5. Add a test in `src/tests/progressService.test.js`.

## Adding a badge

1. Append a definition to `src/data/badges.json` using an existing requirement type
   (`count`, `destination`, `accuracy`, `all_badges`) or extend
   `evaluateRequirement` with a new type.
2. If the requirement needs a new metric, add it to `buildMetrics` in
   `src/engines/badgeEngine.js`.
3. Keep `space_expert` last; it evaluates every other badge.
4. Run `npm test` — schema validation covers the new definition.

## Adding a quiz question

1. Add it to `src/data/quizQuestions.json` with `artifact id`, `options` containing the
   exact `correctAnswer`, and points matching the difficulty (10/20/30).
2. Add the id to the artifact's `quizQuestionIds` (the dataset test compares both
   directions).
3. Run `npm test`.

## Adding a decoder puzzle

1. Add the puzzle with `isSimulated: true`.
2. For ciphers, include `shift` or a 26-letter `cipherAlphabet`, and make sure
   `encodedMessage` decodes to `correctAnswer`; the decoder test verifies this for every
   mechanical puzzle.
3. Provide at least one progressive hint. Each hint costs 5 points, with a 25% floor.
4. Run `npm test`.

## Styling

- Single stylesheet: `src/styles/global.css`, driven by CSS custom properties.
- Palette: deep navy background, white text, cyan/blue accents, muted blue-grey copy.
- Components use descriptive class names (`artifact-card`, `option-button`,
  `encoded-message`, …) and no CSS-in-JS dependency.
- Responsive breakpoint at 720 px; `prefers-reduced-motion` removes transitions.

## Verification

```bash
npm install
npm test        # 111 tests: data, engines, services, hooks via integration
npm run build   # production bundle
npm run dev     # local development server
```

Manual browser verification was not performed in this environment because no browser
binary is available; the jsdom integration suite renders the real `App`, navigates
between pages, opens artifacts, completes a quiz and solves a decoder puzzle. See
`DEVELOPMENT_REPORT.md` for the exact status and limitations.

## Offline behaviour

After the static assets load, all gameplay works without a network connection. Only
external NASA source links require internet access.
