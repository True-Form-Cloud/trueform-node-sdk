import { TrueformInvalidRequestError } from '../errors.js'
import type { Trueform } from '../trueform.js'
import type { RequestOptions, Validation, ValidationCreateParams } from '../types.js'

export class ValidationsResource {
  constructor(private readonly client: Trueform) {}

  create(params: ValidationCreateParams, options?: RequestOptions): Promise<Validation> {
    if (!params || typeof params.email !== 'string' || params.email.trim() === '') {
      throw new TrueformInvalidRequestError('The email parameter must be a non-empty string.', {
        code: 'invalid_email',
      })
    }

    return this.client.request<Validation>('POST', '/v1/validations', {
      body: { email: params.email },
      ...options,
    })
  }
}