Rules:

Use gh for Github

# Project Overview
Terminal adventure game.

## Stack & Commands

- Stack: TanStack Start (React 19) + Vite + TypeScript + Tailwind CSS v4
- Package Manager: Bun
- `bun install` - Install dependencies
- `bun run dev` - Start dev server with hot reload
- `bun run build` - Production build (Nitro/Vite)
- `bun run preview` - Serve production build locally
- `bun run test` - Run Vitest test suite once
- `bun run test:watch` - Run Vitest in watch mode
- `bun run lint` - Lint codebase via ESLint
- `bun run format` - Format code via Prettier

## Engineering Role
When implementing features, refactoring components, or modifying state, adhere to the standards defined in: `.agents/roles/software_engineer.md`

# Documentation Index & Agent Access Control

Agents must strictly consult the documents in the Active Specifications list according to their assigned roles. Documents marked Ignored / Human Only or located in archive directories must never be read, parsed, or cited during automated task execution.

### Active Specifications (Agent Permitted)
- `_docs/architecture.md`: System boundary rules (UI vs. Engine vs. Content) and implementation flow.
- `_docs/design_system.md`: Styling tokens, font hierarchies, color semantics, and layout constraints.
- `.agents/docs/game_map.md`: Ground truth for state transitions, node IDs, item checks, and puzzle navigation.
- `docs/process.md`: Operational standards, git hygiene, commit conventions, and repository workflow.
- `content.json`: Read-only string catalog. Only access to map node IDs to display strings; never modify.

### Ignored / Human Only (Agents Do Not Read)
- `_docs/archive/`: Entire archive directory. Contains historical notes, deprecated specs, and archived planning docs (including `plan.md`). Agents must never read or reference files in this directory.
- `_docs/gameplay.md`: Author-facing reference and playthrough walkthrough. Agents must NOT read or parse this document (rely exclusively on `.agents/docs/game_map.md`).


