import { isAxiosError } from 'axios'

export interface ApiProblemDetails {
  type?: string
  title?: string
  status?: number
  code?: string
  message?: string
  detail?: string
}

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError<ApiProblemDetails>(error)) {
    return error.response?.data?.message ?? error.response?.data?.detail ?? fallback
  }

  return error instanceof Error && error.message ? error.message : fallback
}

export const getApiErrorCode = (error: unknown): string | undefined => {
  if (isAxiosError<ApiProblemDetails>(error)) return error.response?.data?.code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
