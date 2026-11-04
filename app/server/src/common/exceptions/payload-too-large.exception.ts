import {
  HttpStatus,
  PayloadTooLargeException as NestPayloadTooLargeException,
} from '@nestjs/common'
import {
  ApplicationExceptionOptions,
  splitExceptionOptions,
} from './application-exception.options'
import { ErrorCode } from './error-code'
import { createProblemDetails } from './problem-details'

export class PayloadTooLargeException extends NestPayloadTooLargeException {
  constructor(
    message: string,
    options: ApplicationExceptionOptions = {},
  ) {
    const { details, httpOptions } = splitExceptionOptions(options)
    super(
      createProblemDetails(
        HttpStatus.PAYLOAD_TOO_LARGE,
        'Payload Too Large',
        ErrorCode.PAYLOAD_TOO_LARGE,
        message,
        details,
      ),
      httpOptions,
    )
  }
}
