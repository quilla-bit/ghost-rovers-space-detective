# Decoder System

`src/engines/decoderEngine.js` implements the decoder minigame as a deterministic
state machine over immutable state.

## Simulated content notice

Every puzzle in `src/data/decoderPuzzles.json` has `"isSimulated": true`, and the file
carries a top-level notice. The UI displays a "Simulated transmission" notice on every
puzzle. These messages are fictional educational puzzles, **not** NASA transmissions,
and must never be presented as historical data.

## Puzzle format

```json
{
  "id": "decoder_phoenix_water",
  "title": "The Frozen Signal",
  "artifactId": "mars_phoenix",
  "difficulty": "beginner",
  "type": "caesar_cipher",
  "shift": 3,
  "encodedMessage": "ZDWHU",
  "correctAnswer": "WATER",
  "acceptedAnswers": ["water"],
  "hints": ["…", "…", "…"],
  "explanation": "…",
  "context": "…",
  "points": 20,
  "maxAttempts": 3,
  "isSimulated": true
}
```

Types: `caesar_cipher` (requires `shift`), `letter_substitution` (requires a 26-letter
`cipherAlphabet`), `number_to_letter`, `artifact_identification` (clues, no cipher).

## State machine

```
IDLE ──startPuzzle──▶ PUZZLE_ACTIVE
                          │
          correct ────────┼────────────▶ COMPLETED
          wrong, attempts  │
          remaining ───────┴──────────▶ RETRY_AVAILABLE
                                          │
          attempts exhausted ─────────────┴──▶ NEXT_PUZZLE
COMPLETED / NEXT_PUZZLE ──completePuzzle──▶ PUZZLE_ACTIVE (next) or runComplete
```

- `RETRY_AVAILABLE` accepts further answers and hints.
- `NEXT_PUZZLE` means attempts are exhausted and the answer has been revealed; the
  player can advance.
- Advancing from the last puzzle sets `runComplete: true` instead of cycling.
- `requestHint` returns a puzzle from `RETRY_AVAILABLE` to `PUZZLE_ACTIVE`.

## State shape

```js
{
  status, puzzles /* queue, includes answers */, pool,
  currentIndex, attempts, hintsUsed, hintsRevealed,
  input, score, history, runComplete,
  startedAt, puzzleStartedAt, completedAt
}
```

`getDecoderState()` returns a UI-safe snapshot with the answer key stripped and
`pointsAvailable` computed from the current hint count.

## API

### `initializeDecoder({ puzzles, puzzleCount = 5, difficulties = null, rng }) → state`

Prepares a shuffled, de-duplicated queue and returns `IDLE`. Throws when the bank is
empty or a difficulty filter matches nothing.

### `startPuzzle(state, now) → { state, result }`

Activates the current puzzle: resets attempts, hints and input; sets `startedAt` once.
Refuses to restart a puzzle already in progress.

### `submitDecoderAnswer(state, input, now) → { state, result }`

- Requires `PUZZLE_ACTIVE` or `RETRY_AVAILABLE`.
- Validates input through `validateAnswerInput` (non-empty, ≤ 120 normalised chars).
- Matching is case-insensitive, whitespace-normalised and punctuation-tolerant.
- Correct: `COMPLETED`, points awarded, history entry written.
- Incorrect with attempts left: `RETRY_AVAILABLE` with `attemptsRemaining`.
- Incorrect at the limit: `NEXT_PUZZLE`, answer revealed, zero points, history entry
  with `solved: false`.
- Completed or exhausted puzzles reject further submissions.

`maxAttempts` comes from the puzzle, falling back to `DEFAULT_MAX_ATTEMPTS` (3).

### `requestHint(state) → { state, result }`

Reveals `hints[hintsUsed]`, increments `hintsUsed`, and reports
`hintsRemaining`/`pointsAvailable`. When no hints remain it returns
`revealed: false` without changing state, so repeated clicks cannot inflate anything.
Hints are unavailable in `COMPLETED`, `NEXT_PUZZLE` or `IDLE`.

### `getDecoderState(state)` / `getCurrentPuzzle(state)` / `hasNextPuzzle(state)`

Snapshot helpers for the UI. `getCurrentPuzzle` removes `correctAnswer` and
`acceptedAnswers`.

### `completePuzzle(state, now)` (alias `nextPuzzle`)

Advances `currentIndex` and reactivates the next puzzle, or sets `runComplete` when the
queue is finished. Only valid from `COMPLETED` or `NEXT_PUZZLE`.

### `resetDecoder(state, options)`

Builds a fresh run from the original pool with the same run length.

## Cipher helpers

| Function | Behaviour |
| --- | --- |
| `caesarShift(text, shift)` | Positive shift decodes, negative encodes; non-letters pass through. |
| `numbersToLetters("13-1-18-19")` | 1 = A … 26 = Z; out-of-range numbers become `?`. |
| `substitutionDecode(text, alphabet)` | Requires 26 unique letters, otherwise throws. |
| `decodePuzzle(puzzle)` | Applies the right helper; `null` for identification puzzles. |
| `checkDecoderAnswer(puzzle, input)` | Normalised comparison against accepted answers. |

The test suite decodes every mechanical puzzle in the dataset and asserts the result
equals `correctAnswer`, so data and engine cannot silently drift apart.

## Scoring

`getDecoderPoints(basePoints, hintsUsed)` from `utils/scoring.js`: 5 points removed per
hint with a 25% floor. `pointsAvailable` in the snapshot always shows the current value.

## React binding

`src/hooks/useDecoder.js`:

```js
const {
  state, snapshot, puzzle, feedback, error,
  initialize, startRun, startPuzzle, submitAnswer,
  requestHint, nextPuzzle, resetDecoder, clearDecoder
} = useDecoder({ puzzles?, puzzleCount?, onPuzzleResult? });
```

`startRun()` prepares and activates the first puzzle in one step.
`onPuzzleResult(payload)` fires once per solved or exhausted puzzle, with
`{ puzzleId, artifactId, difficulty, solved, attempts, hintsUsed, score, completedAt }`,
which `App` forwards to the progress service.
