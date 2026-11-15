# Project Overview
Terminal adventure game built with TanStack Start (React 19), Vite, TypeScript, and Tailwind CSS v4.

## Guardrails
- Read-only files: Never modify `content.json` or `.agents/docs/game_map.md`.
- Decoupling: Load all narrative strings dynamically from `content.json`; never hardcode text in `src/engine/`.
- Design system: All UI components and styling updates must follow `_docs/design_system.md`.

## Active Specifications (Agent Permitted)
- `_docs/architecture.md`: 3-tier system boundary rules (UI vs. Engine vs. Content) and telemetry pipeline.
- `_docs/design_system.md`: Styling tokens, typography, color semantics, and layout constraints.
- `.agents/docs/engine_mechanics.md`: Runtime invariants, auto-resolve loops, snapshot lifecycles, and prompt helpers.
- `.agents/docs/game_map.md`: Read-only state graph, node IDs, item gates, and content resolution rules.
- `_docs/process.md`: Repository PR verification checks, documentation rules, and testing standards.
- `content.json`: Read-only string dictionary.

## Ignored / Human Only (Agents Do Not Read)
- `_docs/archive/`: Historical notes and deprecated planning docs.
- `_docs/gameplay.md`: Author walkthrough (use `.agents/docs/game_map.md` instead).
- `README.md`: Human-facing overview and local setup guide.
