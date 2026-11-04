# How we work

## Git
- **Branching:** Always create a dedicated branches from `main` using the format `<issue-number>-<short-description>`, `fix-<short-description>`, or `docs-<short-description>`.
- **Commit Frequently:** Commits should be small and all tests should pass
- **PRs:** Always comment on PRs with a summary of commits. Before opening a PR run: 
    * `bun run lint`
    * `bun run format`
    * `bun run test`
    * `bun run build`
- **Docs:** documents should be updated in the same PR as the codechange. 

## Testing
- **Mandatory Test Coverage:** Any change or addition to the game engine (`src/engine/`), state transitions, command parsing, or inventory logic must include unit tests.
- **Test File Location:** All unit tests must be placed strictly in `src/engine/__tests__/` using the naming format <module>.test.ts. Do not co-locate test files in source directories.
- **Bug Fix Verification:** Bug fixes must include a regression test reproducing the issue before the fix.
- **Test Runner:** All tests are run via `bun run test` (Vitest). Never open a PR with failing or skipped tests.
