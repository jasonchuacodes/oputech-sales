import { HttpStatus } from '@nestjs/common'
import { ErrorCode } from './error-code'

export interface ProblemDetails {
  type: string
  title: string
  status: HttpStatus
  code: ErrorCode
  message: string
  detail: string
  details?: unknown
}

const toProblemType = (code: ErrorCode) =>
  `urn:oputech:sales:problem:${code.toLowerCase().replaceAll('_', '-')}`

export const createProblemDetails = (
  status: HttpStatus,
  title: string,
  code: ErrorCode,
  message: string,
  details?: unknown,
): ProblemDetails => ({
  type: toProblemType(code),
  title,
  status,
  code,
  message,
  detail: message,
  ...(details === undefined ? {} : { details }),
})
