import axios from './axios'
import { getActiveTenantId } from './tenant-scope'

interface GraphQLErrorShape {
  message: string
  extensions?: {
    code?: string
    status?: number
    type?: string
    title?: string
    originalError?: { status?: number; statusCode?: number; code?: string; message?: string }
  }
}

interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLErrorShape[]
}

export class GraphQLRequestError extends Error {
  readonly status?: number
  readonly code?: string
  readonly type?: string
  readonly title?: string

  constructor(error: GraphQLErrorShape) {
    super(error.message)
    this.name = 'GraphQLRequestError'
    this.status =
      error.extensions?.status ??
      error.extensions?.originalError?.status ??
      error.extensions?.originalError?.statusCode
    this.code = error.extensions?.code ?? error.extensions?.originalError?.code
    this.type = error.extensions?.type
    this.title = error.extensions?.title
  }
}

export const requestGraphQL = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { tenantId?: string; signal?: AbortSignal },
): Promise<T> => {
  const tenantId = options?.tenantId ?? getActiveTenantId()
  const response = await axios.post<GraphQLResponse<T>>(
    '/graphql',
    { query, variables },
    {
      baseURL: '/',
      signal: options?.signal,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
    }
  )

  const error = response.data.errors?.[0]
  if (error) throw new GraphQLRequestError(error)
  if (!response.data.data) throw new Error('The server returned no data')

  return response.data.data
}
