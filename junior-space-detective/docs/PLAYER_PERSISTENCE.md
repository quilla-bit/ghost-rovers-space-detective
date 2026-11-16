# Player Persistence

All progress is stored in the browser. There is no server, account or sync feature.

## Storage key

```js
"junior_space_detective_progress_v1"
```

The key is versioned (`SCHEMA_VERSION = 1` in `utils/constants.js`). Bump the schema
version **and** the key suffix when a breaking change ships, or add a migration in
`validateStoredProgress`.

## Progress schema

```json
{
  "version": 1,
  "player": { "id": "local-player", "createdAt": "...", "lastPlayed": "..." },
  "statistics": {
    "totalScore": 0,
    "quizzesCompleted": 0,
    "questionsAnswered": 0,
    "correctAnswers": 0,
    "incorrectAnswers": 0,
    "decoderPuzzlesCompleted": 0,
    "artifactsExplored": 0
  },
  "exploration": { "exploredArtifactIds": [] },
  "achievements": { "unlockedBadgeIds": [], "unlockHistory": [] },
  "quizHistory": [],
  "decoderHistory": []
}
```

History entries:

```js
// quizHistory
{ sessionId, score, totalQuestions, correctAnswers, incorrectAnswers,
  accuracy, difficultyBreakdown, completedAt }

// decoderHistory
{ puzzleId, difficulty, solved, attempts, hintsUsed, score, completedAt }
```

## Service API

`createStorageService({ storage, key, now, onWarning })` returns:

| Method | Behaviour |
| --- | --- |
| `loadProgress()` | Returns a valid record; never throws. |
| `saveProgress(progress)` | Validates, serialises, writes; returns `{ saved, error }`. |
| `updateProgress(updater)` | Load → transform → validate → save. |
| `clearProgress()` | Removes the key; returns `{ cleared, error }`. |
| `validateStoredProgress(raw)` | Bound validation helper. |
| `isAvailable()` | Whether a usable Storage backend exists. |
| `getWriteCount()` | Number of real writes (tests/diagnostics). |

`storage` can be injected, which is how the tests run without touching real browser
storage (`createMemoryStorage()` in the test files). Passing `null` simulates a browser
with storage disabled.

## Load and repair rules

1. No backend available → default progress, no throw.
2. Key absent/empty → default progress.
3. JSON parse failure → default progress + warning.
4. Wrong `version` → warning, fields repaired, current version stamped on next save.
5. Missing sections → filled from defaults.
6. Invalid numbers → clamped to `>= 0`; booleans and strings coerced only where safe.
7. Arrays → non-strings removed, ids de-duplicated.
8. **Derived counters are recomputed**, not trusted:
   - `statistics.artifactsExplored = exploredArtifactIds.length`
   - `statistics.decoderPuzzlesCompleted = unique solved puzzle ids`
   This prevents a partially written save from inflating progress.

Repairs are surfaced through `onWarning` so the UI (or a developer) can see them.

## Write strategy

- One write per meaningful activity event, performed after the state update.
- Identical payloads are skipped (`lastSerialized` comparison), so repeated renders,
  no-op events or a second save of the same data do not hit `localStorage`.
- Writes are immediate rather than debounced, so closing the tab cannot lose an event.
- Quota or permission failures return `{ saved: false, error }` and are shown to the
  player; gameplay continues with in-memory state.

## Progress service integration

`progressService` is the only writer. It loads once at construction, then persists after
every applied event, after badge awards and after a reset. React reads snapshots via
`useSyncExternalStore`, so the interface reflects new state immediately.

### Idempotency

| Activity | Duplicate handling |
| --- | --- |
| `ARTIFACT_EXPLORED` | Second visit to the same id does not change statistics or badges (only `lastPlayed`). |
| `QUIZ_COMPLETED` | Same `sessionId` is ignored. |
| `DECODER_COMPLETED` | A puzzle already solved is ignored; failed attempts are recorded but never award score. |
| Badges | `unlockedBadgeIds` guard prevents repeat awards and repeat timestamps. |

## Reset

`progressService.resetProgress()` writes a fresh default record, clears badge and score
state and notifies subscribers. The profile page requires an explicit two-step
confirmation before calling it.

## Limitations

- `localStorage` is per origin, browser profile and device. Progress does **not**
  synchronise between devices, browsers or private/incognito sessions.
- Clearing browser data deletes progress permanently.
- Storage can be unavailable (privacy modes, enterprise policy); the app then works
  for the session without saving, and the header shows a warning.
- No credentials or personal information are stored. The only identity is the constant
  `"local-player"`.
