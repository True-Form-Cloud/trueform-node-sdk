export interface ValidationCreateParams {
  email: string
}

export interface Validation {
  email: string
  is_valid_format: boolean
  is_freemail: boolean
  is_disposable: boolean
  has_mx_records: boolean
  did_you_mean: string | null
  is_deliverable: boolean
}

export interface RequestOptions {
  /** Abort this request from the calling application. */
  signal?: AbortSignal
  /** Override the client timeout for this request, in milliseconds. */
  timeout?: number
  /** Override the client retry count for this request. */
  maxRetries?: number
}

export interface TrueformOptions {
  /** Override the Trueform API base URL. */
  baseURL?: string
  /** Request timeout in milliseconds. Defaults to 10 seconds. */
  timeout?: number
  /** Number of retries for connection, timeout, rate-limit, and server errors. Defaults to 2. */
  maxRetries?: number
  /** Inject a Fetch-compatible implementation. */
  fetch?: typeof globalThis.fetch
}