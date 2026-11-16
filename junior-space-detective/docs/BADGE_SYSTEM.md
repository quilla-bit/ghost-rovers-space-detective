# Badge System

`src/engines/badgeEngine.js` evaluates declarative requirements from
`src/data/badges.json`. It is independent of React and of which component triggered
the activity.

## Badge format

```json
{
  "id": "code_breaker",
  "name": "Code Breaker",
  "description": "Solve five decoder puzzles.",
  "icon": "lock_open",
  "category": "decoder",
  "requirement": { "type": "count", "metric": "decoderPuzzlesCompleted", "target": 5 },
  "points": 75,
  "rarity": "rare"
}
```

`icon` is an identifier rendered by `components/shared/BadgeCard.jsx`. `category` is
free text used for grouping/labels (`quiz`, `exploration`, `decoder`, `mastery`).

## Current collection

| Badge | Requirement | Points | Rarity |
| --- | --- | --- | --- |
| First Steps | `quizzesCompleted >= 1` | 25 | common |
| Moon Explorer | explored a Moon artifact | 25 | common |
| Red Planet Detective | explored a Mars artifact | 25 | common |
| Deep Space Traveler | explored a Deep Space artifact | 35 | uncommon |
| Sharp Mind | best quiz accuracy ≥ 80 | 50 | uncommon |
| Decoder Rookie | `decoderPuzzlesCompleted >= 1` | 25 | common |
| Code Breaker | `decoderPuzzlesCompleted >= 5` | 75 | rare |
| NASA Historian | `artifactsExplored >= 10` | 75 | rare |
| Perfect Mission | `perfectQuizzes >= 1` | 100 | rare |
| Space Expert | every other badge unlocked | 250 | legendary |

## Requirement types

| Type | Shape | Satisfied when |
| --- | --- | --- |
| `count` | `{ metric, target }` | `metrics[metric] >= target` |
| `destination` | `{ destination }` | the player explored at least one artifact there |
| `accuracy` | `{ target }` | best quiz accuracy ≥ target **and** at least one quiz completed |
| `all_badges` | `{}` | every badge whose requirement is not `all_badges` is unlocked |

Requirements are data, not code. Adding a badge with an existing type needs no engine
change.

## Metrics

`buildMetrics(progress, artifacts)` derives:

```js
{
  totalScore, quizzesCompleted, questionsAnswered, correctAnswers, incorrectAnswers,
  decoderPuzzlesCompleted, artifactsExplored,
  bestQuizAccuracy, perfectQuizzes,
  destinations: ["Moon", "Mars", "Deep Space"],
  moonArtifactsExplored, marsArtifactsExplored, deepSpaceArtifactsExplored
}
```

- `artifactsExplored` is the size of the de-duplicated explored id set.
- `bestQuizAccuracy` and `perfectQuizzes` come from `quizHistory`.
- Destination counts require the artifact index, so unknown ids are ignored rather than
  guessed.

## Evaluation API

### `evaluateBadges({ badges, metrics, unlockedBadgeIds, now }) → { newlyUnlocked, progress, metrics }`

- Evaluates ordinary badges first, then mastery badges, so `all_badges` can unlock in
  the same pass as the badge that completes the set.
- Skips badges already in `unlockedBadgeIds`; they are never returned twice and never
  receive a second timestamp.
- Each newly unlocked badge is returned with `unlockedAt` from the injected clock.
- `progress` contains one entry per badge, in definition order, with
  `{ badgeId, name, description, icon, category, rarity, points, requirement,
  unlocked, current, target, percent, satisfied }`, with `current` capped at `target`.

### `evaluateRequirement(requirement, metrics, unlockedBadgeIds, allBadges)`

Returns `{ satisfied, current, target }`. Unknown requirement types fail closed.

### `countUnlockedBadges(progress)` / `getBadgePoints(progress, badges)`

Small helpers for summaries.

## Event-driven integration

`progressService` owns the flow:

```
activity event
  → update statistics/history
  → buildMetrics()
  → evaluateBadges()
  → add badge ids + unlock timestamps
  → add badge points to statistics.totalScore
  → saveProgress()
  → notify subscribers (App shows a toast)
```

A single activity can unlock several badges at once (for example, exploring three
artifacts of different destinations). Conversely, a repeated activity unlocks nothing
because the underlying statistics are idempotent.

## Anti-duplication guarantees

- `progressService` refuses to explore the same artifact twice.
- `progressService` refuses a second `QUIZ_COMPLETED` for the same session id.
- `progressService` refuses a second solved `DECODER_COMPLETED` for the same puzzle id.
- `evaluateBadges` filters on `unlockedBadgeIds` before awarding.
- Badge points are therefore awarded exactly once per badge.

## Tests

`src/tests/badgeEngine.test.js` covers metric derivation, every requirement type,
simultaneous unlocks, duplicate prevention, capped progress, mastery ordering and point
totals. `src/tests/progressService.test.js` verifies the event-to-badge pipeline.
