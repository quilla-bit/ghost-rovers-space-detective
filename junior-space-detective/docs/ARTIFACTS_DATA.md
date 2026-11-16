# Artifact Database

`src/data/artifacts.json` is the single source of truth for artifact facts. The quiz,
explorer, decoder and badges all reference it by `id`.

## Collection (25 artifacts)

| Destination | Count | Examples |
| --- | --- | --- |
| Moon | 9 | Apollo 11 Eagle descent stage, Apollo 15 LRV, Surveyor 1 and 3, LCROSS Centaur |
| Mars | 9 | Sojourner, Viking 1, Spirit, Opportunity, Phoenix, InSight, Ingenuity, Curiosity, Perseverance |
| Deep Space | 7 | Pioneer 10/11, Voyager 1/2, New Horizons, Cassini, Mariner 4 |

Operational status is deliberately mixed so learners can distinguish "finished mission"
from "hardware destroyed" from "still working":

- `operational` — Voyager 1, Voyager 2, New Horizons, Curiosity, Perseverance.
- `partially_operational` — Apollo 11 EASEP (retro-reflector still works, seismometer dead).
- `inactive` — hardware intact but silent (Apollo descent stages, rovers, Pioneers).
- `mission_complete` — Phoenix, InSight (mission formally ended).
- `retired` — Ingenuity (rotor damage ended flights).
- `destroyed` — LCROSS Centaur, Cassini (deliberate impacts).

## Field reference

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Unique, snake_case, stable (referenced by questions and puzzles). |
| `name` | string | yes | Display name. |
| `category` | string | yes | Hardware class, e.g. "Lunar Module". |
| `destination` | string | yes | `Moon`, `Mars` or `Deep Space`. |
| `mission` | string | yes | Programme or mission name. |
| `agency` | string | yes | `NASA` for all current entries. |
| `deploymentDate` | string | yes | `YYYY-MM-DD`. Landing date for landers/rovers; launch date for free-flying spacecraft. |
| `status` | string | yes | One of the six status values above. |
| `communicationStatus` | string | yes | Plain-language current contact state. |
| `locationDescription` | string | yes | Where the hardware is now. |
| `missionObjective` | string[] | yes | Non-empty. |
| `scientificDiscoveries` | string[] | yes | Non-empty, factual results only. |
| `historicalSignificance` | string | yes | Why the artifact matters. |
| `educationalSummary` | string | yes | Two-sentence learner-facing summary. |
| `funFacts` | string[] | yes | Non-empty. |
| `difficulty` | string | yes | `beginner`, `intermediate`, `advanced`. |
| `relatedArtifacts` | string[] | yes | Must reference existing ids, never itself. |
| `quizQuestionIds` | string[] | yes | Must match the question bank exactly, in both directions. |
| `image` | string \| null | yes | `null` until a licensed asset exists. |
| `sources` | object[] | yes | At least one `{title, publisher, url, type}` with an https URL. |

## Source policy

- Primary sources only: NASA mission pages on `nasa.gov` / `science.nasa.gov` and the
  NASA NSSDCA spacecraft catalogue.
- URLs were requested during development and only HTTP 200 endpoints are used.
- No source URL is constructed from memory alone, and no URL is invented.
- `publisher` always names NASA or a NASA data centre.

## Validation

`utils/validation.js → validateArtifacts()` checks:

- duplicate ids, required strings, array shapes;
- `destination`, `difficulty` and `status` against the constant vocabularies;
- ISO date validity (including real calendar dates);
- source presence, title, publisher and http(s) URL shape;
- `relatedArtifacts` existence and self-reference;
- `image` type.

Run it from the test suite (`src/tests/artifacts.test.js`) or directly:

```js
import artifactsData from "./src/data/artifacts.json";
import { validateArtifacts } from "./src/utils/validation.js";
console.log(validateArtifacts(artifactsData));
```

The test suite also asserts that `quizQuestionIds` and `question.artifactId` agree in
both directions, which prevents orphaned links.

## Adding an artifact

1. Add the record with a new unique `id`.
2. Add at least one verified NASA source.
3. Add one or more quiz questions with `artifactId` set to the new id.
4. Update `quizQuestionIds` (or re-run the link consistency test to see the mismatch).
5. Update related artifacts if the cross-links are useful.
6. Run `npm test`.

Do not add invented mission histories, dates, discoveries or source URLs. If a claim
cannot be traced to a NASA source, leave it out.
