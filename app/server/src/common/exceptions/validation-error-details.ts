import { ValidationError } from 'class-validator'

export interface ValidationErrorDetail {
  field: string
  messages: string[]
}

export const getValidationErrorDetails = (
  errors: ValidationError[],
  parent = '',
): ValidationErrorDetail[] =>
  errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property
    const current = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : []
    const children = error.children?.length
      ? getValidationErrorDetails(error.children, field)
      : []

    return [...current, ...children]
  })
