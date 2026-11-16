# Quiz Engine

`src/engines/quizEngine.js` is pure JavaScript with no React or DOM dependency. A
session is a plain immutable object; every function returns a new session.

## Question format

```json
{
  "id": "quiz_lrv_001",
  "artifactId": "apollo15_lrv",
  "question": "Which Apollo mission first used the Lunar Roving Vehicle?",
  "type": "multiple_choice",
  "difficulty": "beginner",
  "options": ["Apollo 11", "Apollo 12", "Apollo 15", "Apollo 17"],
  "correctAnswer": "Apollo 15",
  "explanation": "Apollo 15 introduced the rover in 1971…",
  "points": 10
}
```

Supported `type` values: `multiple_choice`, `true_false`, `artifact_identification`,
`mission_knowledge`, `scientific_discovery`. All use the `options` array, so every
answer is validated against a fixed set.

## Session shape

```js
{
  id: "quiz-1",
  status: "active" | "completed",
  questions: [ /* full records, including correctAnswer */ ],
  currentIndex: 0,
  answers: [
    { questionId, artifactId, difficulty, givenAnswer, correctAnswer,
      correct, pointsEarned, hintsUsed, answeredAt }
  ],
  score: 0,
  startedAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
  config: { questionCount, difficulties, pool }
}
```

## API

### `createQuizSession(options) → session`

| Option | Default | Description |
| --- | --- | --- |
| `questions` | required | Full question bank; throws if empty. |
| `questionCount` | 5 | Clamped to 1…20 and to the available pool size. |
| `difficulties` | `null` | Array filter; throws if nothing matches. |
| `rng` | `Math.random` | Injectable random function for deterministic tests. |
| `now` | `() => new Date()` | Injectable clock. |
| `sessionId` | generated | Explicit id for tests. |

Duplicates are removed by `id`, so one question can never appear twice in a session.

### `getCurrentQuestion(session) → public question | null`

Returns the question **without** `correctAnswer`. Returns `null` when the session is
complete. This is the only question payload the UI is allowed to use.

### `submitAnswer(session, input, options) → { session, result }`

`options`: `{ hintsUsed = 0, questionId, now }`.

Rejections (state unchanged, `result.accepted === false`):

- no session;
- session already complete;
- `questionId` does not match the active question (stale UI);
- the active question has already been answered;
- empty or whitespace-only input;
- input longer than 200 characters;
- input that does not match any option.

Acceptance returns:

```js
{
  accepted: true,
  correct,
  givenAnswer, correctAnswer, explanation,
  pointsEarned,
  isLastQuestion,
  message
}
```

The session advances to the next question, or becomes `completed` on the last one.

### `getQuizResults(session) → results`

```js
{
  score, totalQuestions, answered,
  correctAnswers, incorrectAnswers,
  accuracy,                 // rounded percentage, 0 when nothing answered
  completedAt, startedAt,
  difficultyBreakdown: { beginner: { total, correct, incorrect, points } },
  status, isComplete
}
```

### `getQuizProgress(session)` / `isQuizComplete(session)` / `getQuestionCount(session)`

Small helpers used by the UI progress bar.

### `resetQuiz(session, options) → session`

Creates a fresh session from the original bank (`config.pool`), with the same question
count and difficulty filter.

## Scoring

Centralised in `utils/scoring.js`:

| Difficulty | Base points |
| --- | --- |
| beginner | 10 |
| intermediate | 20 |
| advanced | 30 |

- Incorrect answers score 0.
- `getAnswerPoints(difficulty, hintsUsed)` subtracts 5 points per hint, with a floor of
  25% of the base value (so a beginner answer never drops below 3 points).
- Each question is scored once: duplicate submissions are rejected before any points
  are awarded.
- Total session score is the sum of `pointsEarned`.

The quiz UI does not currently offer hints, but the engine and scoring support
`hintsUsed` for future quiz hint content; the decoder uses the same rule set.

## React binding

`src/hooks/useQuiz.js`:

```js
const {
  session, currentQuestion, questionNumber, totalQuestions, progress,
  feedback, results, error, isComplete,
  startQuiz, submitAnswer, resetQuiz, clearQuiz
} = useQuiz({ questions?, questionCount?, onComplete? });
```

- `onComplete(results)` fires exactly once per session id (guarded by a ref),
  even under React StrictMode.
- `startQuiz({ questionCount, difficulties })` replaces the session.
- Failures are exposed through `error` and leave the previous state intact.

## Tests

`src/tests/quizEngine.test.js` covers initialisation, sampling, de-duplication,
difficulty filtering, answer-key hiding, correct/incorrect scoring, normalisation,
empty and invalid input, duplicate submissions, hint penalties, completion, results
and reset. Integration coverage lives in `src/tests/integration.test.jsx`.
