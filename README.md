# Trueform Node.js SDK

The official Node.js client for the [Trueform email validation API](https://trueform.cloud/docs/).

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

The resource interface follows the same shape as Stripe's Node.js SDK:

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