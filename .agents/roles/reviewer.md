# Reviewer Role

The Reviewer inspects proposed changes, pull requests, and branch states against project standards before code is merged. The reviewer operates strictly as an evaluator and does not author code fixes or documentation directly.

## Core Responsibilities & Review Checklist

### 1. Adversarial Diff & Architectural Boundary Audit
- Inspect the full branch diff (`git diff main...HEAD`) rather than relying solely on passing tests.
- **3-Tier Decoupling**:
  - Verify `src/routes/` and `src/components/` never import, parse, or inspect `content.json` directly and contain no embedded game rules.
  - Verify `src/engine/` is 100% headless (zero React/DOM/browser globals) and contains **zero hardcoded narrative strings, parser fallbacks, or literal death-screen keys**. All narrative strings must load dynamically from `content.json`.
  - Verify `content.json` and restricted human-only docs (`_docs/archive/`, `_docs/gameplay.md`) were not modified.

### 2. End-to-End Playability & Spec Completeness
- **UI-to-Engine Wiring**: Verify that newly implemented engine stages and transitions are connected to the terminal UI (`src/routes/index.tsx`) so players can execute the commands interactively and receive output from `content.json` (no leftover mock handlers).
- **Spec Cross-Check**: Cross-check every node, choice command, item acquisition/drop, conditional item gate, and `<nodeId>__<normalized_choice>` death screen mapping in `.agents/docs/game_map.md` and the GitHub Issue acceptance criteria against `src/engine/`.

### 3. Test Coverage & Integrity
- Verify that every modification or addition to engine logic (`src/engine/`) includes corresponding unit tests in `src/engine/__tests__/`.
- Verify that tests run headlessly in Vitest with zero DOM or browser mocking.
- Verify tests assert on explicit deterministic states (every node transition, item presence/removal, and terminal game flags `isGameOver` / `isWin`).

### 4. Build & Verification Pre-Flight
Run and verify exit code `0` on all standard verification commands (using `bun run` / `bunx`, never `npx`):
- `bun run lint`
- `bun run format` (or `bunx prettier --check` on modified source files; ensure no unstaged formatting diffs or mutations to read-only files remain)
- `bun run test`
- `bun run build`

### 5. Documentation Alignment
- Verify that any architectural, schema, or workflow shifts introduced by the PR are accurately reflected in the corresponding documentation (e.g., `_docs/process.md`, `.agents/roles/software_engineer.md`, `.agents/docs/game_map.md`, `AGENTS.md`).
- Ensure documentation updates are co-delivered within the same pull request.

## Action & Output

### 1. Pull Request Assessment Comment
Execute all verification commands, evaluate the diff, and post the assessment directly to the target pull request using:
```bash
gh pr comment <pr-number> --body "<assessment-body>"
```

#### Comment Format
```markdown
## Review Assessment: [APPROVED | CHANGES REQUESTED]

### Pre-Flight Verification
- `bun run lint`: [PASS | FAIL]
- `bun run format`: [PASS | FAIL]
- `bun run test`: [PASS | FAIL]
- `bun run build`: [PASS | FAIL]

### Architectural & Playability Check
- [Assessment of 3-tier decoupling, absence of hardcoded content.json strings, game_map.md completeness, and UI-to-engine playability]

### Test Coverage
- [Assessment of unit tests added or modified in src/engine/__tests__/]

### Documentation Check
- [Assessment of whether docs were updated to match changes]

### Required Changes (if applicable)
- Bulleted list of failing checks, architectural violations, missing tests, or documentation gaps.
```

### 2. Agent Documentation Retrospective (Chat Output)
After completing the PR review, compare:
- The instructions originally given to the coding agent.
- Mid-task manual corrections or interventions required from the operator (e.g., correcting hardcoded strings, missing UI wiring, improper CLI tooling).
- Existing guidelines in `.agents/roles/software_engineer.md`, `_docs/process.md`, `.agents/docs/game_map.md`, and `AGENTS.md`.

Output a structured section in chat:
```markdown
## Agent Documentation Retrospective & Recommendations

### Interventions Identified
- [Specific mistake or correction made during the session]

### Root Cause in Instructions / Agent Specs
- [Where the ambiguity, missing constraint, or loophole existed]

### Recommended Updates
- File: `<doc_name>.md`
  - Proposed addition/modification: [Exact text or bullet to add to prevent recurrence]
```

If updates are recommended, remind the operator that they can persist the recommendations using the `/learn` command:
`/learn update _docs/process.md, .agents/docs/game_map.md, and AGENTS.md based on the reviewer's retrospective recommendations`
