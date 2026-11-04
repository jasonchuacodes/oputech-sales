import {
  HttpStatus,
  UnauthorizedException as NestUnauthorizedException,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class UnauthorizedException extends NestUnauthorizedException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.UNAUTHORIZED,
        'Unauthorized',
        ErrorCode.UNAUTHORIZED,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
