import { TrueformAPIError, TrueformInvalidRequestError } from '../errors.js'
import type { RequestOptions, Validation, ValidationCreateParams } from '../types.js'

type ValidationRequester = (email: string, options?: RequestOptions) => Promise<unknown>

export class ValidationsResource {
  constructor(private readonly requestValidation: ValidationRequester) {}

  create(params: ValidationCreateParams, options?: RequestOptions): Promise<Validation> {
    if (!params || typeof params.email !== 'string' || params.email.trim() === '') {
      throw new TrueformInvalidRequestError('The email parameter must be a non-empty string.', {
        code: 'invalid_email',
      })
    }

    return this.requestValidation(params.email, options).then(parseValidation)
  }
}

function parseValidation(value: unknown): Validation {
  if (
    !isRecord(value) ||
    typeof value.email !== 'string' ||
    typeof value.is_valid_format !== 'boolean' ||
    typeof value.is_freemail !== 'boolean' ||
    typeof value.is_disposable !== 'boolean' ||
    typeof value.has_mx_records !== 'boolean' ||
    (value.did_you_mean !== null && typeof value.did_you_mean !== 'string') ||
    typeof value.is_deliverable !== 'boolean'
  ) {
    throw new TrueformAPIError('The API returned an invalid validation response.', {
      code: 'invalid_response',
    })
  }

  return {
    email: value.email,
    is_valid_format: value.is_valid_format,
    is_freemail: value.is_freemail,
    is_disposable: value.is_disposable,
    has_mx_records: value.has_mx_records,
    did_you_mean: value.did_you_mean,
    is_deliverable: value.is_deliverable,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}