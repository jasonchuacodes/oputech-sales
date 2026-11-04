import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorCode, getApiErrorMessage } from './api-error'

const apiError = new AxiosError(
  'Request failed',
  'ERR_BAD_REQUEST',
  undefined,
  undefined,
  {
    data: {
      code: 'CONFLICT',
      message: 'This username is already in use.',
    },
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
  },
)

describe('API error helpers', () => {
  it('uses the backend-provided message', () => {
    expect(getApiErrorMessage(apiError, 'Fallback')).toBe(
      'This username is already in use.',
    )
  })

  it('exposes the stable backend error code', () => {
    expect(getApiErrorCode(apiError)).toBe('CONFLICT')
  })

  it('uses a fallback when no safe backend message exists', () => {
    expect(getApiErrorMessage({}, 'Please try again.')).toBe('Please try again.')
  })
})
