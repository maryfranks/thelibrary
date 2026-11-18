# How We Work

## Pull Requests & Verification

- **Pre-PR Checks:** Run all checks before completing tasks or opening a PR:
  - `bun run lint`
  - `bun run format` (or `bunx prettier` on modified source files; never format read-only files such as `content.json` or `.agents/docs/game_map.md`)
  - `bun run test`
  - `bun run build` (run before `bunx tsc --noEmit` when route changes regenerate `src/routeTree.gen.ts`)
  - `bunx tsc --noEmit`
- **Documentation Sync:** Update relevant documentation in the same PR as code changes.

## Testing

- **Mandatory Coverage:** Changes to `src/engine/`, state transitions, command parsing, or inventory logic must include unit tests.
- **Test File Location:** Place engine unit tests in `src/engine/__tests__/<module>.test.ts` and React UI/routing tests in `src/test/<feature>.test.tsx`. Do not co-locate test files in source directories.
- **Bug Fix Verification:** Bug fixes must include a regression test reproducing the issue before the fix.
- **Test Runner:** Run tests via `bun run test` (Vitest). Never open a PR with failing or skipped tests.
