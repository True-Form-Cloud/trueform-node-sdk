# Trueform Node.js SDK

[![npm version][npm-version-badge]][npm-package]
[![CI][ci-badge]][ci]
[![Node.js 20+][node-badge]][npm-package]
[![MIT License][license-badge]][license]

The official Node.js client for the [Trueform email validation API](https://trueform.cloud/docs/).
Validate email format, disposable and freemail providers, common domain typos, and mail routing
without an API key.

[Documentation](https://trueform.cloud/docs/node/) | [API reference](https://trueform.cloud/docs/api-reference/) | [npm][npm-package] | [Changelog](https://github.com/True-Form-Cloud/trueform-node-sdk/blob/main/CHANGELOG.md) | [Issues](https://github.com/True-Form-Cloud/trueform-node-sdk/issues)

## Features

- Typed results and error classes
- ESM and CommonJS builds with zero runtime dependencies
- Built-in retries for connection failures, timeouts, rate limits, and server errors
- Per-request timeouts and `AbortSignal` support

## Install

```bash
npm install trueform-node
```

The SDK supports Node.js 20 and newer. It has no runtime dependencies and does not require an API
key.

## Quickstart

```ts
import Trueform from 'trueform-node'

const trueform = new Trueform()

const validation = await trueform.validations.create({
  email: 'user@example.com',
})

if (validation.is_deliverable) {
  console.log('Email looks good')
}
```

The client uses a resource-based interface:

```ts
trueform.validations.create(params, options)
```

## Handle validation results

```ts
const result = await trueform.validations.create({ email })

if (result.did_you_mean) {
  console.log(`Did you mean ${result.did_you_mean}?`)
}

if (result.is_disposable) {
  console.log('Ask for a permanent email address')
}
```

`is_deliverable` is a domain-level verdict. It does not prove that a specific mailbox exists.

## Configure the client

```ts
const trueform = new Trueform({
  timeout: 5_000,
  maxRetries: 2,
})
```

Override options for one request:

```ts
const controller = new AbortController()

const result = await trueform.validations.create(
  { email: 'user@example.com' },
  {
    signal: controller.signal,
    timeout: 2_000,
    maxRetries: 0,
  },
)
```

The client retries connection failures, timeouts, rate limits, and server errors. A
`Retry-After` response header controls the delay when present.

## Errors

```ts
import Trueform, {
  TrueformInvalidRequestError,
  TrueformRateLimitError,
} from 'trueform-node'

const trueform = new Trueform()

try {
  await trueform.validations.create({ email: 'user@example.com' })
} catch (error) {
  if (error instanceof TrueformRateLimitError) {
    console.error(`Retry after ${error.retryAfter}ms`)
  } else if (error instanceof TrueformInvalidRequestError) {
    console.error(error.message)
  } else {
    throw error
  }
}
```

Exported errors:

- `TrueformError`
- `TrueformAPIError`
- `TrueformInvalidRequestError`
- `TrueformRateLimitError`
- `TrueformConnectionError`
- `TrueformTimeoutError`

API errors expose `code`, `status`, and `requestId` when available.

## CommonJS

```js
const { Trueform } = require('trueform-node')

const trueform = new Trueform()
```

## Development

```bash
npm install
npm run check
```

Read the [contributing guide](https://github.com/True-Form-Cloud/trueform-node-sdk/blob/main/CONTRIBUTING.md)
before opening a pull request. Report vulnerabilities through the process in the
[security policy](https://github.com/True-Form-Cloud/trueform-node-sdk/blob/main/SECURITY.md).

## Trueform SDKs

| Platform | Registry | Source |
| --- | --- | --- |
| Node.js | [`trueform-node` on npm][npm-package] | [GitHub](https://github.com/True-Form-Cloud/trueform-node-sdk) |
| PHP | [`trueform/trueform` on Packagist](https://packagist.org/packages/trueform/trueform) | [GitHub](https://github.com/True-Form-Cloud/trueform-php-sdk) |
| Ruby | [`trueform` on RubyGems](https://rubygems.org/gems/trueform) | [GitHub](https://github.com/True-Form-Cloud/trueform-ruby-sdk) |
| Python | [`trueform-cloud` on PyPI](https://pypi.org/project/trueform-cloud/) | [GitHub](https://github.com/True-Form-Cloud/trueform-python-sdk) |

## License

MIT. See the [license][license].

[npm-package]: https://www.npmjs.com/package/trueform-node
[npm-version-badge]: https://img.shields.io/npm/v/trueform-node?logo=npm&logoColor=white
[ci]: https://github.com/True-Form-Cloud/trueform-node-sdk/actions/workflows/ci.yml
[ci-badge]: https://github.com/True-Form-Cloud/trueform-node-sdk/actions/workflows/ci.yml/badge.svg
[node-badge]: https://img.shields.io/node/v/trueform-node?logo=nodedotjs&logoColor=white
[license]: https://github.com/True-Form-Cloud/trueform-node-sdk/blob/main/LICENSE
[license-badge]: https://img.shields.io/github/license/True-Form-Cloud/trueform-node-sdk