import { describe, expect, it, vi } from 'vitest'
import Trueform, {
  TrueformAPIError,
  TrueformInvalidRequestError,
  TrueformRateLimitError,
  TrueformTimeoutError,
  type Validation,
} from '../src/index.js'

const validation: Validation = {
  email: 'user@example.com',
  is_valid_format: true,
  is_freemail: false,
  is_disposable: false,
  has_mx_records: true,
  did_you_mean: null,
  is_deliverable: true,
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function fetchMock(implementation: typeof fetch): typeof fetch {
  return vi.fn(implementation) as unknown as typeof fetch
}

describe('Trueform', () => {
  it('uses a Stripe-style validations.create interface', async () => {
    const fetcher = fetchMock(async () => jsonResponse(validation))
    const trueform = new Trueform({ fetch: fetcher })

    await expect(trueform.validations.create({ email: 'User@Example.com' })).resolves.toEqual(
      validation,
    )

    expect(fetcher).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(fetcher).mock.calls[0]!
    expect(url).toBe('https://trueform-main-069715d.d2.zuplo.dev/v1/validations')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ email: 'User@Example.com' }))
  })

  it('supports an injected base URL and request options', async () => {
    const fetcher = fetchMock(async () => jsonResponse(validation))
    const trueform = new Trueform({
      baseURL: 'http://localhost:8787/',
      fetch: fetcher,
      maxRetries: 0,
    })
    const controller = new AbortController()

    await trueform.validations.create(
      { email: 'user@example.com' },
      { signal: controller.signal, timeout: 500, maxRetries: 0 },
    )

    const [url, init] = vi.mocked(fetcher).mock.calls[0]!
    expect(url).toBe('http://localhost:8787/v1/validations')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects an empty email before making a request', () => {
    const fetcher = fetchMock(async () => jsonResponse(validation))
    const trueform = new Trueform({ fetch: fetcher })

    expect(() => trueform.validations.create({ email: '  ' })).toThrow(
      TrueformInvalidRequestError,
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns a typed invalid-request error', async () => {
    const fetcher = fetchMock(async () =>
      jsonResponse({ error: 'Missing or empty "email" field.' }, 400, {
        'x-request-id': 'req_123',
      }),
    )
    const trueform = new Trueform({ fetch: fetcher, maxRetries: 0 })

    await expect(trueform.validations.create({ email: 'bad' })).rejects.toMatchObject({
      name: 'TrueformInvalidRequestError',
      code: 'invalid_request',
      status: 400,
      requestId: 'req_123',
    })
  })

  it('returns retry details with a rate-limit error', async () => {
    const fetcher = fetchMock(async () =>
      jsonResponse({ error: 'Too Many Requests' }, 429, { 'Retry-After': '2' }),
    )
    const trueform = new Trueform({ fetch: fetcher, maxRetries: 0 })

    await expect(trueform.validations.create({ email: 'user@example.com' })).rejects.toMatchObject({
      name: 'TrueformRateLimitError',
      code: 'rate_limit',
      status: 429,
      retryAfter: 2_000,
    } satisfies Partial<TrueformRateLimitError>)
  })

  it('retries a transient API error', async () => {
    const fetcher = fetchMock(
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'Unavailable' }, 503))
        .mockResolvedValueOnce(jsonResponse(validation)),
    )
    const trueform = new Trueform({ fetch: fetcher, maxRetries: 1 })

    await expect(trueform.validations.create({ email: 'user@example.com' })).resolves.toEqual(
      validation,
    )
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('times out a request', async () => {
    const fetcher = fetchMock(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const trueform = new Trueform({ fetch: fetcher, timeout: 10, maxRetries: 0 })

    await expect(trueform.validations.create({ email: 'user@example.com' })).rejects.toBeInstanceOf(
      TrueformTimeoutError,
    )
  })

  it('rejects invalid JSON from a successful response', async () => {
    const fetcher = fetchMock(async () => new Response('not json', { status: 200 }))
    const trueform = new Trueform({ fetch: fetcher, maxRetries: 0 })

    await expect(trueform.validations.create({ email: 'user@example.com' })).rejects.toMatchObject({
      name: 'TrueformAPIError',
      code: 'invalid_response',
      status: 200,
    } satisfies Partial<TrueformAPIError>)
  })
})