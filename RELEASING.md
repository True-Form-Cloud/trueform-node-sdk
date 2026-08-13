# Releasing

## npm setup

The GitHub repository needs an `NPM_TOKEN` Actions secret with permission to publish
`trueform-node`. Keep two-factor authentication enabled for the npm account.

## Prepare a release

1. Start from a clean `main` branch with passing CI.
2. Update `CHANGELOG.md`.
3. Set the package version with `npm version <patch|minor|major> --no-git-tag-version`.
4. Run `npm install --package-lock-only` to keep the lockfile version in sync.
5. Run `npm run check`.
6. Merge the version and changelog update into `main`.
7. Create a GitHub release with a tag that exactly matches `v<package version>`.

Publishing the GitHub release runs the release workflow. The workflow verifies the tag, runs all
checks, and publishes to npm with provenance.

For the first npm release, confirm that the `trueform-node` package name is still available before
publishing.