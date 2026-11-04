import { HttpExceptionOptions } from '@nestjs/common'

export interface ApplicationExceptionOptions extends HttpExceptionOptions {
  details?: unknown
}

export const splitExceptionOptions = ({
  details,
  ...httpOptions
}: ApplicationExceptionOptions) => ({ details, httpOptions })
