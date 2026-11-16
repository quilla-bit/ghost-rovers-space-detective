# Junior Space Detective

An educational browser game about NASA equipment left behind on the Moon, on Mars and
in deep space, built for the **NASA Space Apps Challenge — "Abandoned but not
Forgotten"**.

Players read artifact dossiers, answer mission questions and decode simulated
transmissions. Every activity updates a local explorer profile and unlocks badges.

## Features

- **25 researched NASA artifacts** across Moon (9), Mars (9) and Deep Space (7), each
  with mission objectives, scientific results, current status, communication status,
  fun facts and verified NASA source links.
- **Quiz engine** with five question formats, difficulty filtering, randomised order,
  53 questions, per-difficulty scoring and a full debrief (score, accuracy,
  per-difficulty breakdown).
- **Decoder minigame** with a real state machine, Caesar ciphers, keyword substitution,
  number-to-letter codes, artifact riddles, progressive hints, attempt limits and
  score penalties. All messages are clearly labelled as simulated.
- **Achievement system** with 10 badges, declarative requirements, progress tracking and
  duplicate protection.
- **Explorer profile** with lifetime statistics, badge collection, per-destination
  exploration and a safe progress reset.
- **Browser-only persistence** through a versioned `localStorage` key, with repair of
  malformed or outdated saves.

## Technology stack

React 19 · JavaScript (ES modules) · Vite 8 · HTML5 · CSS3 · Vitest 5 ·
React Testing Library · jsdom. No backend, no router dependency, no UI framework.

## Getting started

```bash
cd junior-space-detective
npm install
npm run dev
```

Vite prints the local URL (default `http://localhost:5173`).

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm test` | Run the full Vitest suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |

## Project structure

```
junior-space-detective/
├── public/               images, icons, assets (placeholders)
├── src/
│   ├── data/             artifacts, quiz questions, decoder puzzles, badges
│   ├── engines/          quizEngine, decoderEngine, badgeEngine (pure JS)
│   ├── services/         storageService, progressService, artifactService
│   ├── hooks/            usePlayerProgress, useQuiz, useDecoder
│   ├── utils/            constants, scoring, validation, randomisation
│   ├── components/       artifacts / quiz / decoder / achievements / shared
│   ├── pages/            Home, ArtifactExplorer, DetectiveQuiz, DecoderGame, ExplorerProfile
│   ├── styles/global.css NASA-inspired design system
│   ├── tests/            7 suites, 111 tests
│   ├── App.jsx
│   └── main.jsx
├── docs/                 architecture and system documentation
├── index.html
├── vite.config.js        Vite + Vitest configuration
└── package.json
```

## Testing

```bash
npm test
```

The suite covers the artifact dataset and schema, quiz engine, decoder engine, badge
engine, storage service, progress service and a full end-to-end player journey through
the rendered application.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Artifact data](docs/ARTIFACTS_DATA.md)
- [Quiz engine](docs/QUIZ_ENGINE.md)
- [Decoder system](docs/DECODER_SYSTEM.md)
- [Badge system](docs/BADGE_SYSTEM.md)
- [Player persistence](docs/PLAYER_PERSISTENCE.md)
- [Integration guide](docs/INTEGRATION_GUIDE.md)

## Data accuracy

Artifact facts come from NASA mission pages and the NASA NSSDCA. Source links were
checked during development. No source URL, mission history or scientific result was
invented; if a claim could not be supported by a NASA source it was left out.
Decoder messages are fictional puzzles and are labelled as such in the interface.

## Notes and limitations

- Progress is saved in the current browser only and does not sync across devices.
- Answers ship in the client bundle; the UI never exposes them before submission, but
  this is an educational game, not a secure assessment system.
- No mission imagery is bundled (`image: null` on every artifact); the interface uses
  typography, colour and mission metadata instead of fabricated photos.
- After assets load, gameplay works offline. NASA source links need an internet
  connection.
