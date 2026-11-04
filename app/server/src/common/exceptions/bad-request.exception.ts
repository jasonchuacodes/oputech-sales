import {
  BadRequestException as NestBadRequestException,
  HttpStatus,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class BadRequestException extends NestBadRequestException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.BAD_REQUEST,
        'Bad Request',
        ErrorCode.BAD_REQUEST,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
