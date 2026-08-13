import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const esm = await import('../dist/index.js')
const require = createRequire(import.meta.url)
const cjs = require('../dist/index.cjs')

for (const entrypoint of [esm, cjs]) {
  assert.equal(typeof entrypoint.default, 'function')
  assert.equal(entrypoint.default, entrypoint.Trueform)
  assert.equal(typeof entrypoint.TrueformAPIError, 'function')
  assert.equal(typeof entrypoint.TrueformRateLimitError, 'function')

  let userAgent
  const client = new entrypoint.Trueform({
    maxRetries: 0,
    fetch: async (_input, init) => {
      userAgent = new Headers(init?.headers).get('User-Agent')
      return new Response(
        JSON.stringify({
          email: 'user@example.com',
          is_valid_format: true,
          is_freemail: false,
          is_disposable: false,
          has_mx_records: true,
          did_you_mean: null,
          is_deliverable: true,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    },
  })

  await client.validations.create({ email: 'user@example.com' })
  assert.equal(userAgent, 'trueform-node/0.1.0')
}

console.log('ESM and CommonJS entry points load correctly.')