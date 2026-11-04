import {
  HttpStatus,
  UnprocessableEntityException as NestUnprocessableEntityException,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class InvalidInputException extends NestUnprocessableEntityException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Invalid Input',
        ErrorCode.INVALID_INPUT,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
