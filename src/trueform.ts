import {
  TrueformAPIError,
  TrueformConnectionError,
  TrueformInvalidRequestError,
  TrueformRateLimitError,
  TrueformTimeoutError,
} from './errors.js'
import { ValidationsResource } from './resources/validations.js'
import type { RequestOptions, TrueformOptions } from './types.js'

declare const __TRUEFORM_VERSION__: string

const DEFAULT_BASE_URL = 'https://trueform-main-069715d.d2.zuplo.dev'
const DEFAULT_TIMEOUT = 10_000
const DEFAULT_MAX_RETRIES = 2
const MAX_RETRY_DELAY = 60_000
const SDK_VERSION = typeof __TRUEFORM_VERSION__ === 'undefined' ? 'dev' : __TRUEFORM_VERSION__

interface InternalRequestOptions extends RequestOptions {
  body?: Record<string, unknown>
}

interface ErrorBody {
  error?: unknown
}

interface RequestSignal {
  signal: AbortSignal
  timedOut(): boolean
  cleanup(): void
}

export class Trueform {
  readonly validations: ValidationsResource

  private readonly baseURL: string
  private readonly timeout: number
  private readonly maxRetries: number
  private readonly fetcher: typeof globalThis.fetch

  constructor(options: TrueformOptions = {}) {
    this.baseURL = normalizeBaseURL(options.baseURL ?? DEFAULT_BASE_URL)
    this.timeout = positiveInteger(options.timeout ?? DEFAULT_TIMEOUT, 'timeout')
    this.maxRetries = nonNegativeInteger(options.maxRetries ?? DEFAULT_MAX_RETRIES, 'maxRetries')

    const fetcher = options.fetch ?? globalThis.fetch
    if (typeof fetcher !== 'function') {
      throw new TypeError('A Fetch-compatible implementation is required.')
    }

    this.fetcher = fetcher
    this.validations = new ValidationsResource((email, requestOptions) =>
      this.request<unknown>('POST', '/v1/validations', {
        body: { email },
        ...requestOptions,
      }),
    )
  }

  private async request<T>(
    method: 'POST',
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T> {
    const timeout = positiveInteger(options.timeout ?? this.timeout, 'timeout')
    const maxRetries = nonNegativeInteger(options.maxRetries ?? this.maxRetries, 'maxRetries')

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.requestOnce<T>(method, path, options.body, options.signal, timeout)
      } catch (error) {
        if (attempt >= maxRetries || !isRetryable(error, options.signal)) {
          throw error
        }

        await sleep(retryDelay(error, attempt), options.signal)
      }
    }
  }

  private async requestOnce<T>(
    method: 'POST',
    path: string,
    body: Record<string, unknown> | undefined,
    externalSignal: AbortSignal | undefined,
    timeout: number,
  ): Promise<T> {
    const requestSignal = createRequestSignal(externalSignal, timeout)

    try {
      const response = await this.fetcher(`${this.baseURL}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': `trueform-node/${SDK_VERSION}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: requestSignal.signal,
      })
      const responseBody = await readResponseBody(response)

      if (!response.ok) {
        throw errorFromResponse(response, responseBody)
      }

      if (responseBody === null || typeof responseBody !== 'object') {
        throw new TrueformAPIError('The API returned an invalid JSON response.', {
          code: 'invalid_response',
          status: response.status,
          requestId: requestId(response),
        })
      }

      return responseBody as T
    } catch (error) {
      if (error instanceof TrueformAPIError) throw error

      if (requestSignal.timedOut()) {
        throw new TrueformTimeoutError(`Request timed out after ${timeout}ms.`, {
          code: 'request_timeout',
          cause: error,
        })
      }

      if (externalSignal?.aborted) {
        throw new TrueformConnectionError('The request was aborted.', {
          code: 'request_aborted',
          cause: externalSignal.reason ?? error,
        })
      }

      throw new TrueformConnectionError('Unable to connect to the Trueform API.', {
        code: 'connection_error',
        cause: error,
      })
    } finally {
      requestSignal.cleanup()
    }
  }
}

function normalizeBaseURL(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('baseURL must use HTTP or HTTPS.')
  }

  return value.replace(/\/+$/, '')
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer.`)
  }

  return value
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer.`)
  }

  return value
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') return null

  try {
    return JSON.parse(text)
  } catch (cause) {
    if (!response.ok) return null

    throw new TrueformAPIError('The API returned an invalid JSON response.', {
      code: 'invalid_response',
      status: response.status,
      requestId: requestId(response),
      cause,
    })
  }
}

function errorFromResponse(response: Response, body: unknown): TrueformAPIError {
  const message =
    body && typeof body === 'object' && typeof (body as ErrorBody).error === 'string'
      ? (body as { error: string }).error
      : `Request failed with status ${response.status}.`
  const common = {
    status: response.status,
    requestId: requestId(response),
  }

  if (response.status === 400) {
    return new TrueformInvalidRequestError(message, {
      ...common,
      code: 'invalid_request',
    })
  }

  if (response.status === 429) {
    return new TrueformRateLimitError(message, {
      ...common,
      code: 'rate_limit',
      retryAfter: retryAfter(response),
    })
  }

  return new TrueformAPIError(message, {
    ...common,
    code: 'api_error',
  })
}

function requestId(response: Response): string | undefined {
  return response.headers.get('x-request-id') ?? response.headers.get('cf-ray') ?? undefined
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('retry-after')
  if (!value) return undefined

  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000)

  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

function isRetryable(error: unknown, externalSignal: AbortSignal | undefined): boolean {
  if (externalSignal?.aborted) return false
  if (error instanceof TrueformRateLimitError) return true
  if (error instanceof TrueformTimeoutError) return true
  if (error instanceof TrueformConnectionError) return error.code === 'connection_error'
  return error instanceof TrueformAPIError && (error.status === 408 || (error.status ?? 0) >= 500)
}

function retryDelay(error: unknown, attempt: number): number {
  if (error instanceof TrueformRateLimitError && error.retryAfter !== undefined) {
    return Math.min(error.retryAfter, MAX_RETRY_DELAY)
  }

  if (error instanceof TrueformAPIError && error.retryAfter !== undefined) {
    return Math.min(error.retryAfter, MAX_RETRY_DELAY)
  }

  return Math.min(250 * 2 ** attempt, 2_000)
}

function createRequestSignal(externalSignal: AbortSignal | undefined, timeout: number): RequestSignal {
  const controller = new AbortController()
  let didTimeOut = false

  const abortFromCaller = () => controller.abort(externalSignal?.reason)

  if (externalSignal?.aborted) {
    abortFromCaller()
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timer = setTimeout(() => {
    didTimeOut = true
    controller.abort()
  }, timeout)

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', abortFromCaller)
    },
  }
}

async function sleep(duration: number, signal: AbortSignal | undefined): Promise<void> {
  if (duration <= 0) return
  if (signal?.aborted) throw abortError(signal.reason)

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', onAbort)
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, duration)
    const onAbort = () => {
      clearTimeout(timer)
      cleanup()
      reject(abortError(signal?.reason))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function abortError(reason: unknown): TrueformConnectionError {
  return new TrueformConnectionError('The request was aborted.', {
    code: 'request_aborted',
    cause: reason,
  })
}