import {
  ForbiddenException as NestForbiddenException,
  HttpStatus,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class ForbiddenException extends NestForbiddenException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.FORBIDDEN,
        'Forbidden',
        ErrorCode.FORBIDDEN,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
