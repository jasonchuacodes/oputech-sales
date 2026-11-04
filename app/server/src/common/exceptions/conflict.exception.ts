import {
  ConflictException as NestConflictException,
  HttpStatus,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class ConflictException extends NestConflictException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.CONFLICT,
        'Conflict',
        ErrorCode.CONFLICT,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
