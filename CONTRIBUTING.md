# Contributing

## Set up the repository

Use Node.js 20 or newer and install the locked dependencies:

```bash
npm ci
```

## Make a change

Keep the public interface backward compatible unless the change is planned for a major release.
Add or update tests for behavior changes, and update the README when the documented interface changes.

Run the complete local check before opening a pull request:

```bash
npm run check
```

This command runs the TypeScript compiler, test suite, package build, runtime entry-point checks,
Publint, and Are the Types Wrong.

## Pull requests

Keep each pull request focused. Describe the user-facing behavior, testing performed, and any
compatibility impact. Do not commit generated tarballs or files from `dist`.

Report security problems through [GitHub Security Advisories](SECURITY.md), not a public pull
request or issue.