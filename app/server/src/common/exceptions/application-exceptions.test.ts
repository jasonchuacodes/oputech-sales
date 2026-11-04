import {
  ConflictException as NestConflictException,
  HttpStatus,
  NotFoundException as NestNotFoundException,
  UnprocessableEntityException as NestUnprocessableEntityException,
} from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { ConflictException } from './conflict.exception'
import { ErrorCode } from './error-code'
import { formatGraphQLError } from './graphql-error-formatter'
import { InvalidInputException } from './invalid-input.exception'
import { NotFoundException } from './not-found.exception'
import { ProblemDetails } from './problem-details'

describe('application exceptions', () => {
  it('preserves Nest exception semantics and exposes problem details', () => {
    const exception = new NotFoundException(
      'The requested report was not found.',
    )
    const response = exception.getResponse() as ProblemDetails

    expect(exception).toBeInstanceOf(NestNotFoundException)
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND)
    expect(response).toMatchObject({
      type: 'urn:oputech:sales:problem:not-found',
      title: 'Not Found',
      status: HttpStatus.NOT_FOUND,
      code: ErrorCode.NOT_FOUND,
      message: 'The requested report was not found.',
      detail: 'The requested report was not found.',
    })
  })

  it('uses 409 for state conflicts', () => {
    const exception = new ConflictException(
      'This username is already in use.',
    )

    expect(exception).toBeInstanceOf(NestConflictException)
    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT)
  })

  it('uses 422 for valid requests with invalid business input', () => {
    const exception = new InvalidInputException(
      'The report end date must be after its start date.',
    )

    expect(exception).toBeInstanceOf(NestUnprocessableEntityException)
    expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
  })
})

describe('formatGraphQLError', () => {
  it('promotes application problem codes for frontend consumers', () => {
    const formatted = formatGraphQLError(
      {
        message: 'Unprocessable Entity Exception',
        extensions: {
          code: 'BAD_USER_INPUT',
          originalError: {
            type: 'urn:oputech:sales:problem:invalid-input',
            title: 'Invalid Input',
            status: 422,
            code: ErrorCode.INVALID_INPUT,
            message: 'The report end date must be after its start date.',
          },
        },
      },
      true,
    )

    expect(formatted).toEqual({
      message: 'The report end date must be after its start date.',
      extensions: {
        code: ErrorCode.INVALID_INPUT,
        status: 422,
        type: 'urn:oputech:sales:problem:invalid-input',
        title: 'Invalid Input',
      },
    })
  })

  it('redacts unexpected production errors', () => {
    const formatted = formatGraphQLError(
      {
        message: 'MongoServerError: connection details',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      true,
    )

    expect(formatted).toEqual({
      message: 'An unexpected error occurred. Please try again.',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    })
  })
})
