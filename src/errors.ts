export interface TrueformErrorOptions {
  code: string
  status?: number
  requestId?: string
  retryAfter?: number
  cause?: unknown
}

export class TrueformError extends Error {
  readonly code: string
  readonly status?: number
  readonly requestId?: string
  readonly retryAfter?: number

  constructor(message: string, options: TrueformErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = new.target.name
    this.code = options.code
    this.status = options.status
    this.requestId = options.requestId
    this.retryAfter = options.retryAfter
  }
}

export class TrueformAPIError extends TrueformError {}

export class TrueformInvalidRequestError extends TrueformAPIError {}

export class TrueformRateLimitError extends TrueformAPIError {}

export class TrueformConnectionError extends TrueformError {}

export class TrueformTimeoutError extends TrueformConnectionError {}