# Development Report

**Project:** Junior Space Detective — NASA Space Apps Challenge ("Abandoned but not Forgotten")
**Date:** 15 November 2026
**Scope:** Game logic, data architecture, React integration, tests, documentation

---

## 1. Overall implementation status

All required systems are implemented, integrated, tested and documented. The
application builds for production and the development server serves the app and every
module without transform errors.

- 25 researched artifacts across Moon (9), Mars (9) and Deep Space (7).
- 53 quiz questions across five formats.
- 10 decoder puzzles across four puzzle types.
- 10 badges with declarative requirements.
- 7 test files, 111 tests, all passing.
- 7 documentation files plus README.

No functionality was stubbed or left as a placeholder.

## 2. Files created

**Configuration and entry**
- `package.json`, `vite.config.js`, `index.html`, `.gitignore`
- `src/main.jsx`, `src/App.jsx`, `src/styles/global.css`

**Data**
- `src/data/artifacts.json` (25 artifacts)
- `src/data/quizQuestions.json` (53 questions)
- `src/data/decoderPuzzles.json` (10 puzzles)
- `src/data/badges.json` (10 badges)

**Engines**
- `src/engines/quizEngine.js`
- `src/engines/decoderEngine.js`
- `src/engines/badgeEngine.js`

**Services**
- `src/services/storageService.js`
- `src/services/progressService.js`
- `src/services/artifactService.js`

**Hooks**
- `src/hooks/usePlayerProgress.js`
- `src/hooks/useQuiz.js`
- `src/hooks/useDecoder.js`

**Utilities**
- `src/utils/constants.js`
- `src/utils/scoring.js`
- `src/utils/validation.js`
- `src/utils/randomization.js`

**Components**
- `shared/Layout.jsx`, `shared/ProgressBar.jsx`, `shared/StatCard.jsx`,
  `shared/BadgeCard.jsx`, `shared/DestinationChip.jsx`
- `artifacts/ArtifactCard.jsx`, `artifacts/ArtifactDetail.jsx`,
  `artifacts/ArtifactFilters.jsx`
- `quiz/QuestionCard.jsx`, `quiz/QuizResults.jsx`
- `decoder/PuzzlePanel.jsx`
- `achievements/BadgeGrid.jsx`

**Pages**
- `Home.jsx`, `ArtifactExplorer.jsx`, `DetectiveQuiz.jsx`, `DecoderGame.jsx`,
  `ExplorerProfile.jsx`

**Tests**
- `src/tests/setup.js`
- `src/tests/artifacts.test.js`
- `src/tests/quizEngine.test.js`
- `src/tests/decoderEngine.test.js`
- `src/tests/badgeEngine.test.js`
- `src/tests/storageService.test.js`
- `src/tests/progressService.test.js`
- `src/tests/integration.test.jsx`

**Documentation**
- `README.md`, `DEVELOPMENT_REPORT.md`
- `docs/ARCHITECTURE.md`, `docs/ARTIFACTS_DATA.md`, `docs/QUIZ_ENGINE.md`,
  `docs/DECODER_SYSTEM.md`, `docs/BADGE_SYSTEM.md`, `docs/PLAYER_PERSISTENCE.md`,
  `docs/INTEGRATION_GUIDE.md`

**Placeholders**
- `public/images/.gitkeep`, `public/icons/.gitkeep`, `public/assets/.gitkeep`
  (no image assets were fabricated; `image` is `null` for every artifact)

## 3. Files modified

The working directory was empty at the start. There were no pre-existing files to
modify or preserve. Git was initialised in the new project directory; no commits,
remotes or pushes were made.

## 4. Dependencies installed

Runtime:

| Package | Version |
| --- | --- |
| react | 19.3.1 |
| react-dom | 19.3.1 |

Development:

| Package | Version |
| --- | --- |
| vite | 8.3.8 |
| @vitejs/plugin-react | 6.3.0 |
| vitest | 5.1.0 |
| jsdom | 31.0.1 |
| @testing-library/react | 16.3.3 |
| @testing-library/jest-dom | 7.0.1 |
| @testing-library/user-event | 14.6.10 |

No additional libraries were introduced beyond the requested stack.

## 5. Systems completed

### NASA artifact database — Completed
- Schema enforced by `validateArtifacts`: unique ids, required fields, controlled
  vocabularies, ISO dates, source presence and URL shape, relationship integrity.
- Sources limited to NASA mission pages and NASA NSSDCA. Every URL used was requested
  during development and returned HTTP 200; no URL was invented.
- Status vocabulary distinguishes operational / partially operational / inactive /
  mission complete / retired / destroyed, so "abandoned" is not conflated with
  "broken".
- Quiz links are verified in both directions by tests.

### Quiz engine — Completed
- Session creation with injectable RNG and clock, difficulty filtering, de-duplication,
  configurable counts, immutable sessions.
- Answer validation (empty, over-length, non-option, stale question id, duplicate
  submission) with explicit reasons.
- Centralised scoring (10/20/30) with hint penalties and a per-question floor.
- Results include score, correct/incorrect, accuracy, per-difficulty breakdown and
  timestamps.
- `getCurrentQuestion` strips the answer key before rendering.

### Decoder engine — Completed
- Explicit state machine: `IDLE → PUZZLE_ACTIVE → RETRY_AVAILABLE / COMPLETED →
  NEXT_PUZZLE`, plus run completion.
- Progressive hints, hint limits, repeated-hint protection and score reduction.
- Attempt limits with answer reveal on exhaustion.
- Caesar, substitution and number-to-letter decoders. Tests decode every mechanical
  puzzle in the dataset and compare with its stored answer.
- Every puzzle is flagged simulated; the UI labels each message as fictional.

### Badge engine — Completed
- Metrics derived from saved progress and the artifact index (destinations, best
  accuracy, perfect quizzes, unique artifacts).
- Four requirement types including a mastery badge evaluated last.
- Single-pass multi-unlock, capped progress values, unlock timestamps and duplicate
  prevention.

### Player persistence — Completed
- Versioned key `junior_space_detective_progress_v1`.
- Defensive load: missing storage, malformed JSON, version drift, missing fields,
  invalid values and de-duplication.
- Derived counters recomputed from history/exploration to prevent inflated saves.
- Write de-duplication, quota error handling and a two-step reset in the UI.

### React integration — Completed
- `useSyncExternalStore`-based progress subscription; no stale closures or tearing.
- Quiz and decoder hooks keep engine state, expose stable actions and fire completion
  callbacks exactly once per session/puzzle.
- All meaningful activity flows through `progressService`, which evaluates badges and
  persists before notifying the UI.
- Badge unlocks surface as toasts and update header counters immediately.

### Frontend — Completed
- Five views: dashboard, artifact explorer with search/filters/detail, quiz with
  briefing/questions/debrief, decoder with briefing/puzzle summary, explorer profile
  with stats and badge collection.
- NASA-inspired dark navy design, cyan accents, subtle starfield/orbit motif, responsive
  layout, visible focus states, semantic landmarks, ARIA progress bars/live regions and
  reduced-motion support.

## 6. Systems partially completed

None. No required feature was left partial.

Deliberately out of scope (not requested): mission photography, audio, teacher
dashboards, backend accounts, cloud sync, service-worker offline caching.

## 7. Systems not completed

None.

## 8. Automated tests executed

Command:

```bash
npm test
```

(underlying command `vitest run`)

Coverage by file:

| Suite | Tests | Focus |
| --- | --- | --- |
| `artifacts.test.js` | 21 | Schema, uniqueness, destinations, sources, relationships, link consistency, dataset integrity |
| `quizEngine.test.js` | 20 | Session creation, filtering, de-duplication, answer hiding, scoring, validation, duplicates, hints, completion, reset |
| `decoderEngine.test.js` | 22 | Cipher helpers, dataset decoding, state transitions, attempts, hints, penalties, progression, reset |
| `badgeEngine.test.js` | 13 | Metrics, all requirement types, simultaneous unlocks, duplicate prevention, progress, mastery |
| `storageService.test.js` | 12 | Defaults, round-trip, malformed JSON, repairs, derived counters, write de-duplication, quota failure, clear |
| `progressService.test.js` | 14 | Event handling, idempotency, badge rewards, subscribers, persistence, reset |
| `integration.test.jsx` | 9 | Rendered app: navigation, exploration, quiz completion, decoder solve, hints, profile, reset, reload persistence |

## 9. Test results

```
Test Files  7 passed (7)
Tests       111 passed (111)
Duration    ~1.9 s
```

No failing tests, no skipped tests and no weakened assertions. Two initial failures
were genuine test-design errors (tests assumed a fixed shuffled order); they were fixed
by making the tests deterministic through the engines' injectable RNG, and one
timestamp assertion was fixed by injecting the clock. No production code was changed to
make tests pass.

## 10. Build status

`npm run build` succeeds:

```
vite v8.3.8 building client environment for production
✓ 50 modules transformed

dist/index.html                   0.59 kB │ gzip:   0.36 kB
dist/assets/index-*.css          15.30 kB │ gzip:   4.08 kB
dist/assets/index-*.js          364.41 kB │ gzip: 106.78 kB
✓ built in ~107 ms
```

Development server: started with `npm run dev -- --strictPort`, reported ready with no
stderr output. The root document and the modules `src/App.jsx`,
`src/pages/DetectiveQuiz.jsx`, `src/hooks/useDecoder.js`, `src/data/artifacts.json` and
`src/styles/global.css` were fetched over HTTP: all returned 200 with expected payload
sizes. The server was stopped afterwards.

## 11. Known issues and limitations

1. **No manual browser verification.** This environment has no browser binary, so no
   screenshot or real-browser interaction pass was performed. Automated verification is
   jsdom-based (real React tree, user-event clicks/typing). Visual layout, native focus
   rendering and responsive breakpoints were not observed in a real browser.
2. **Client-side answer key.** Answers ship in the bundle. The UI never receives them
   before submission and the engine strips them, but a determined user can inspect the
   JSON. Inherent to a backend-free game.
3. **Single-device progress.** `localStorage` is per browser/profile; there is no sync,
   account or cloud backup, and clearing browser data deletes progress.
4. **No artifact imagery.** `image` is `null` for every artifact to avoid fabricated or
   unlicensed photography; the UI uses typographic cards instead.
5. **External link drift.** NASA source URLs were verified during development; external
   pages can move later.
6. **Progress while offline** works for gameplay but source links need connectivity.
7. **Quiz hints are not exposed in the UI.** The engine and scoring support hint
   penalties, and the decoder uses them; the quiz has no hint content in the dataset, so
   no hint button is shown.
8. **Abandoning a quiz** discards the session without recording a completion. This is
   intentional (only completed quizzes count), but it means no partial-quiz statistics.

## 12. Recommended next steps

1. Run a real-browser pass (Chrome/Lighthouse) for visual, keyboard and responsive
   verification, then fix any layout or contrast findings.
2. Add licensed NASA imagery per artifact and use it on cards and dossiers.
3. Add quiz hint content so the existing hint-penalty scoring is used in both games.
4. Localise the interface and dataset for non-English learners.
5. Add a service worker for full offline caching of static assets.
6. Consider an optional "classroom" export of results (CSV) without introducing accounts.

## 13. Final verification

| System | Status | Evidence |
| --- | --- | --- |
| NASA artifact database | **Completed** | 25 records, schema + relationship + source tests pass |
| Quiz engine | **Completed** | 20 engine tests + rendered quiz completion test pass |
| Decoder engine | **Completed** | 22 engine tests, dataset decode verification, rendered solve test pass |
| Badge system | **Completed** | 13 engine tests + service-level unlock tests pass |
| localStorage persistence | **Completed** | 12 storage tests + service round-trip and reload test pass |
| React integration | **Completed** | 9 integration tests, dev server serves app and modules |
| Automated testing | **Completed** | 111/111 passing across 7 suites |
| Production build | **Completed** | `vite build` succeeds, 50 modules, no errors |

**Overall:** ready for team review and hackathon integration. The only verification gap
is manual real-browser inspection, which is called out above rather than claimed as
done.
