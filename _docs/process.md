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