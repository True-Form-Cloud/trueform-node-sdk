# Releasing

1. Start from a clean `main` branch with passing CI.
2. Update `CHANGELOG.md`.
3. Set the package version with `npm version <patch|minor|major> --no-git-tag-version`.
4. Run `npm install --package-lock-only` to keep the lockfile version in sync.
5. Run `npm run check`.
6. Merge the version and changelog update into `main`.
7. Create a GitHub release with a tag that exactly matches `v<package version>`.
8. Confirm the GitHub Actions release and npm package.