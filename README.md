# The Library

Caught in an unnatural storm, you take refuge in a library. When you get inside, the library is trashed and there's no one in sight. You can't leave—the door locks behind you. Navigate monsters, a maze, and a flooded basement to escape, and find out what happened in that library.

![The Library](.thelibrary.png "The Library")

## Built with

- [TanStack Start](https://tanstack.com/start) (React 19, TypeScript)
- Tailwind CSS v4
- Vite

## 🚀 Getting Started & Local Development 🦖

**Node.js 18 or newer** — install it with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

**Bun 1.2 or newer** — install it with `curl -fsSL https://bun.sh/install | bash`.

```sh
# Install dependencies
bun install

# Start the dev server
bun run dev
```

Open the URL it prints (by default **http://localhost:5173**) in your browser.

## Scripts

| Script               | What it does                         |
| -------------------- | ------------------------------------ |
| `bun run dev`        | Start the dev server with hot reload |
| `bun run build`      | Production build                     |
| `bun run preview`    | Serve the production build locally   |
| `bun run test`       | Run the test suite once              |
| `bun run test:watch` | Run tests in watch mode              |
| `bun run lint`       | Lint the codebase                    |
| `bun run format`     | Format with Prettier                 |

### Production build

```sh
bun run build      # builds the app into the dist/ output
bun run preview    # serves the built app locally
```

## 🚀 Project Structure 🦖

I organized the codebase around a strict three-tier separation of concerns: presentation, game engine logic, and narrative copy. When I started rebuilding the game from my old notebook sketches, I wanted to avoid the usual mess where story text, state machines, and React components bleed into each other. Keeping these boundaries rigid makes it possible to test engine mechanics without a browser, and prevents automated Command-Line Interface (CLI) agents from wandering outside their lane.

```text
├── .agents/          # Compressed, token-efficient instructions and map data for Artificial Intelligence (AI) agents
├── _docs/            # Human-readable architectural specifications, design system tokens, and workflow rules
├── monitoring/       # Grafana dashboard definitions and telemetry configurations
├── public/           # Static web assets (favicon, robots.txt)
├── src/
│   ├── components/   # Presentational terminal User Interface (UI) chrome and Radix primitives
│   ├── engine/       # Headless state machine, stage logic, commands, and telemetry
│   │   └── __tests__/ # Vitest unit tests for transitions, inventory, and puzzles
│   ├── hooks/        # React lifecycle helpers (such as mobile viewport detection)
│   ├── lib/          # Error boundaries and utility helpers
│   ├── routes/       # TanStack Start file-based routes and root layout
│   ├── router.tsx    # Router instance configuration
│   ├── server.ts     # Nitro server entry and server-side error wrappers
│   └── styles.css    # Tailwind CSS v4 design tokens and retro terminal theme
├── content.json      # Narrative text catalog (room descriptions, choices, death screens)
└── vite.config.ts    # Bundled Vite and Nitro configuration targeting Cloudflare
```

### Core Architecture Layers

- **Presentation Layer (`src/routes/`, `src/components/`, `src/styles.css`):**
  Built with TanStack Start and React 19. It functions as a retro terminal UI shell handling raw keystrokes, scroll history, and visual styling. It never imports `content.json` or evaluates puzzle logic directly; it simply renders what the game engine produces.
- **Headless Game Engine (`src/engine/`):**
  A pure TypeScript state machine governing player inventory, room transitions, and command parsing across all five stages (`stage1.ts` through `stage5.ts`). It has zero Document Object Model (DOM) dependencies and zero React imports, allowing full test coverage in isolation via Vitest (`bun run test`).
- **Narrative Content Catalog (`content.json`):**
  All descriptive prose, death screens, and parser replies live in a single static JSON dictionary. Decoupling story copy from code allows editing and proofreading narrative text without touching engine logic.
- **Documentation Partitioning (`_docs/` vs. `.agents/`):**
  I intentionally separated documentation into two distinct tiers. Files in `_docs/` provide human-oriented architectural context, design tokens, and git workflow rules with full formatting. Conversely, `.agents/` contains stripped-down, token-dense specifications (such as `.agents/docs/game_map.md`) designed to preserve context windows when working with CLI agents.

## 🚀 Deployment 🦖

COMING SOON: 

### Telemetry & Observability Pipeline

Client-side gameplay metrics (such as run completions and fatal transitions) are dispatched over OpenTelemetry Protocol (OTLP) to an OpenTelemetry (OTel) collector hosted on Google Cloud Platform (GCP) Virtual Machine (VM). The collector fans metrics out to Victoriametrics for persistence and a Grafana instance (`stats.littlefuzzydinos.com`) for visualization. The configuration for that infrastructure is stored in another, private repo. 

Continuous Integration (CI) automatically updates the Grafana dashboard (`monitoring/dashboards/game-telemetry.json`) on pushes to `main` via GitHub Actions (`.github/workflows/deploy-dashboard.yaml`).

## Roadmap

Testing of core game logic is still underway. The text remains largely a placeholder after the first two stages. There are tickets in the github issue backlog to address testing and expanding placeholder text. The real game text needs to be typed up and entered into the game once final logic is verified.

The app will be deployed to a static cloudflare page at `thelibrary.littlefuzzydinos.com` whenever changes are made to the repo via a github action. 
