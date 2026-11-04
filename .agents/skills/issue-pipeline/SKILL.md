---
name: issue-pipeline
description: >-
  Orchestrates the end-to-end Software Engineer -> Librarian -> Reviewer
  subagent pipeline for a GitHub issue. Activate when the user asks to
  implement, run, or execute a GitHub issue/task through the full role loop.
---

# Issue Pipeline Skill (`SE -> Librarian -> Reviewer`)

Automated multi-agent runbook executing `.agents/roles/software_engineer.md`, `.agents/roles/librarian.md`, and `.agents/roles/reviewer.md` sequentially without user intervention until the PR is reviewed.

## 1. Subagent Registration (`define_subagent`)

Define three role subagents (`EnableWriteTools: true`, `EnableSubagentTools: false`):

1. `software-engineer`:
   - **SystemPrompt**: Follow `.agents/roles/software_engineer.md`, `_docs/process.md`, `_docs/architecture.md`, `_docs/design_system.md`, `.agents/docs/game_map.md`, and `AGENTS.md`. Never read `_docs/archive/` or `_docs/gameplay.md`. Never modify `content.json`.
2. `librarian`:
   - **SystemPrompt**: Follow `.agents/roles/librarian.md`, `_docs/process.md`, and `AGENTS.md`. Zero code footprint (`src/**`, configs, `content.json` forbidden). Never read `_docs/archive/` or `_docs/gameplay.md`.
3. `reviewer`:
   - **SystemPrompt**: Follow `.agents/roles/reviewer.md`, `_docs/process.md`, and `AGENTS.md`. Evaluator only; never modify source or doc files. Never read `_docs/archive/` or `_docs/gameplay.md`.

## 2. Execution Loop

Do not pause for user input between phases. After each `invoke_subagent` call, stop calling tools and wait for the subagent completion message.
- **Pre-Flight Sync**: Before Phase 1, ensure local `main` is synced by running standalone commands `git checkout main` and `git pull --ff-only origin main`.
- **Permission Timeouts**: If a subagent reports a 60s permission prompt timeout, do NOT instruct it to retry immediately. Pause and ask the user to confirm approval before resuming the subagent.
- **Standalone CLI Commands**: Execute standalone CLI commands (e.g., separate `gh issue view`, `git status`, `git add`, `git commit`, `bun run test` calls rather than chaining with `&&`) across all phases so they cleanly match CLI permission allowlists.

### Phase 1: Software Engineer

- Invoke `software-engineer` (`Model: "inherit"`, `Workspace: "inherit"`) for target GitHub issue `#<id>`:
  - Create branch `<id>-<short-description>` from `main`.
  - Implement scoped requirements and unit tests in `src/engine/__tests__/`.
  - Run `bunx prettier --write` (on modified source files only), `bun run lint`, `bun run test`, and `bun run build`.
  - Push branch, open PR against `main`, and comment commit + verification summary on PR.
- Record returned `seConversationId` and PR number `<pr>`.

### Phase 2: Librarian

- Invoke `librarian` (`Model: "inherit"`, `Workspace: "inherit"`) on the active PR branch and `<pr>`:
  - Audit active specs (`AGENTS.md`, `_docs/architecture.md`, `_docs/design_system.md`, `_docs/process.md`, `.agents/docs/game_map.md`) against branch changes.
  - Commit and push doc updates (`docs(...)`) if needed, then comment doc changes on `<pr>`; if none needed, comment `"Docs are up to date"`.
- Record returned `libConversationId`.

### Phase 3: Reviewer

- Invoke `reviewer` (`Model: "inherit"`, `Workspace: "inherit"`) with `<pr>` and transcript paths:
  - Parent: `<appDataDir>/brain/<parentConversationId>/.system_generated/logs/transcript.jsonl`
  - SE: `<appDataDir>/brain/<seConversationId>/.system_generated/logs/transcript.jsonl`
  - Librarian: `<appDataDir>/brain/<libConversationId>/.system_generated/logs/transcript.jsonl`
- Enforce strict 2-step execution inside `reviewer`:
  1. **Step 3a — Clean-Room Code & Playability Audit (Before Reading Transcripts)**:
     - Inspect `git diff main...HEAD`, verify 3-tier decoupling, check `.agents/docs/game_map.md` and issue `#<id>` completeness, and run `bun run lint`, `bunx prettier --check` (on modified files), `bun run test`, and `bun run build`.
     - Post structured `## Review Assessment: [APPROVED | CHANGES REQUESTED]` comment to `<pr>` via `gh pr comment <pr>`.
  2. **Step 3b — Transcript Retrospective (After Code Audit)**:
     - Read the Parent, SE, and Librarian `transcript.jsonl` files (and `transcript_full.jsonl` lines only where `truncated_fields` is present).
     - Identify any failed checks, retries, spec ambiguities, or rule violations across subagent runs.
     - Return the `## Review Assessment` and `## Agent Documentation Retrospective & Recommendations` to the orchestrator.

### Phase 4: Automated Remediation (If `CHANGES REQUESTED`)

- If `reviewer` returns `CHANGES REQUESTED` (up to 3 total iterations):
  - Send required code/test fixes to `software-engineer` via `send_message` (`Recipient: seConversationId`) and doc fixes to `librarian` (`Recipient: libConversationId`).
  - Re-run Phase 3 (`reviewer`) once fixes are pushed.
- If still unapproved after 3 iterations, halt and report blocking issues to the user.

### Phase 5: User Handoff

- When `APPROVED`, present to the user:
  1. PR link and status summary.
  2. Full `## Agent Documentation Retrospective & Recommendations` output from `reviewer`.
