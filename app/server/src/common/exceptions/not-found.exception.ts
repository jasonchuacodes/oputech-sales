import {
  HttpStatus,
  NotFoundException as NestNotFoundException,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class NotFoundException extends NestNotFoundException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCode.NOT_FOUND,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
