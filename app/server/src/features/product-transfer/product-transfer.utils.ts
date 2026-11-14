export const canonicalizeProductName = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ')

export const normalizeProductName = (value: string): string =>
  canonicalizeProductName(value).toLocaleLowerCase('en-US')

export const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return error.code === 11000
}

export const failureMessage = (error: unknown): string => {
  if (
    error instanceof ConflictException ||
    error instanceof InvalidInputException ||
    error instanceof NotFoundException ||
    error instanceof PayloadTooLargeException
  ) {
    return error.message
  }
  return 'The transfer could not be completed due to a temporary processing error.'
}
import {
  ConflictException,
  InvalidInputException,
  NotFoundException,
  PayloadTooLargeException,
} from '../../common/exceptions'
