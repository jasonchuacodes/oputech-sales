export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_INPUT: 'INVALID_INPUT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
