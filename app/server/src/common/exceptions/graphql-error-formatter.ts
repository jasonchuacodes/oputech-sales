import { GraphQLFormattedError } from 'graphql'

interface OriginalErrorShape {
  type?: unknown
  title?: unknown
  status?: unknown
  statusCode?: unknown
  code?: unknown
  message?: unknown
  details?: unknown
}

const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined

export const formatGraphQLError = (
  error: GraphQLFormattedError,
  production = process.env.NODE_ENV === 'production',
): GraphQLFormattedError => {
  const extensions = error.extensions ?? {}
  const original = (extensions.originalError ?? {}) as OriginalErrorShape
  const applicationCode = stringValue(original.code)
  const code = applicationCode ?? stringValue(extensions.code) ?? 'INTERNAL_SERVER_ERROR'
  const status = numberValue(original.status) ?? numberValue(original.statusCode)
  const isUnexpected = code === 'INTERNAL_SERVER_ERROR' && !applicationCode
  const backendMessage = stringValue(original.message) ?? error.message
  const message =
    production && isUnexpected
      ? 'An unexpected error occurred. Please try again.'
      : backendMessage

  return {
    message,
    ...(error.locations ? { locations: error.locations } : {}),
    ...(error.path ? { path: error.path } : {}),
    extensions: {
      code,
      ...(status === undefined ? {} : { status }),
      ...(stringValue(original.type) ? { type: original.type } : {}),
      ...(stringValue(original.title) ? { title: original.title } : {}),
      ...(original.details === undefined ? {} : { details: original.details }),
    },
  }
}
