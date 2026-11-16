# Architecture

## Purpose

Junior Space Detective is a browser-only educational game about NASA equipment left
on the Moon, on Mars and in deep space. It has four systems:

1. A researched NASA artifact database.
2. A quiz engine.
3. A decoder minigame state machine.
4. An achievement (badge) engine.

Player progress is persisted in `localStorage`. There is no backend, no account system
and no network dependency for gameplay (NASA source links open external pages).

## Layer diagram

```
React components / pages          (presentation, no game rules)
        │
        ▼
Hooks (usePlayerProgress,         (React glue, stable callbacks)
       useQuiz, useDecoder)
        │
        ▼
Services (progressService,        (event hub, persistence, lookups)
          storageService,
          artifactService)
        │
        ▼
Engines (quizEngine, decoderEngine, badgeEngine)   (pure functions)
        │
        ▼
Data (artifacts.json, quizQuestions.json,
      decoderPuzzles.json, badges.json)
```

Rules enforced by this layout:

- Engines import only `utils/*` and nothing from React, the DOM or storage.
- Only `progressService` writes saved state.
- Only `storageService` touches `localStorage`.
- Components never import data JSON directly; they use `artifactService`.
- Scoring rules exist once, in `utils/scoring.js`.

## Module responsibilities

| Path | Responsibility |
| --- | --- |
| `src/data/artifacts.json` | Single source of truth for artifact facts, status and sources. |
| `src/data/quizQuestions.json` | Question bank with difficulty, options and explanations. |
| `src/data/decoderPuzzles.json` | Puzzle bank with encodings, hints and simulated-message notice. |
| `src/data/badges.json` | Badge metadata and declarative requirements. |
| `src/engines/quizEngine.js` | Session creation, question selection, submission, scoring, results. |
| `src/engines/decoderEngine.js` | Decoder state machine, attempts, hints, cipher helpers. |
| `src/engines/badgeEngine.js` | Metrics derivation, requirement evaluation, unlock decisions. |
| `src/services/storageService.js` | Load, validate, repair, save, clear versioned progress. |
| `src/services/progressService.js` | Applies activity events, evaluates badges, persists, notifies. |
| `src/services/artifactService.js` | Filtering, lookups, quiz/puzzle links, dataset summary. |
| `src/hooks/*` | React bindings; keep components free of engine details. |
| `src/components/*` | Reusable presentational components grouped by domain. |
| `src/pages/*` | Screen-level composition for the five views. |
| `src/utils/*` | Constants, scoring, validation, randomisation. |

## Data flow

### Exploring an artifact

```
ArtifactExplorer.openArtifact(id)
  → App.handleExplore(id)
  → progressService.recordEvent(ARTIFACT_EXPLORED, {artifactId})
       → dedupe check (already explored? no stats change)
       → update exploration.exploredArtifactIds + statistics.artifactsExplored
       → badgeEngine.evaluateBadges()
       → award badge points into statistics.totalScore
       → storageService.saveProgress()
       → notify subscribers
  → useSyncExternalStore re-renders with new snapshot
  → App shows "Badge unlocked" toast
```

### Finishing a quiz or decoder run

```
useQuiz → quizEngine.submitAnswer() → session completed
  → hook calls onComplete once per session id
  → App.handleQuizResults → progressService.recordEvent(QUIZ_COMPLETED, …)
  → statistics + quizHistory updated, badges evaluated, saved
```

Decoder follows the same path with `DECODER_COMPLETED`, and the service rejects a
second record for a puzzle that has already been solved.

## State management choices

- Engine sessions are immutable. Every function returns a new object, so React state
  updates are trivial and unit tests need no mocks.
- `progressService` exposes `getProgress`, `subscribe` and `getMetrics`. The
  `usePlayerProgress` hook consumes them through `useSyncExternalStore`, which avoids
  stale closures and re-render tearing.
- `progressService` is created by a factory so tests can inject an isolated storage
  backend and a fixed clock. `App` accepts an optional `service` prop for the same
  reason.

## Error handling

- `storageService` never throws. Missing storage, malformed JSON, quota errors and
  schema drift are reported through `onWarning` and the returned `error` strings.
- `progressService` catches throwing subscribers so one broken listener cannot stop
  persistence.
- Engines reject invalid input with `{accepted: false, reason}` instead of throwing,
  except for programmer errors (empty question bank, unknown difficulty) which throw.
- The UI surfaces errors with `role="alert"` and keeps the previous valid state.

## Accessibility and layout

- Semantic landmarks (`header`, `nav`, `main`, `footer`), a skip link and a single
  `h1` per view.
- Visible `:focus-visible` styling, keyboard-operable controls, `aria-current` on
  navigation, `role="progressbar"` with value text, and `aria-live` toasts.
- Responsive layout from 320 px upward; `prefers-reduced-motion` disables transitions.

## Known limitations

- Progress is per browser profile and does not sync across devices.
- Answers live in the client bundle. The UI never receives them before submission, but
  a determined user can read the JSON in devtools; this is inherent to a backend-free
  educational game.
- No images ship with the project (`image: null`); cards use typography and chips
  rather than fabricated mission photography.
- Source URLs were checked for reachability during development, but external NASA
  pages can move.
