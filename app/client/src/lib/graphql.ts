import axios from './axios'

interface GraphQLErrorShape {
  message: string
  extensions?: {
    code?: string
    originalError?: { statusCode?: number }
  }
}

interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLErrorShape[]
}

export class GraphQLRequestError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(error: GraphQLErrorShape) {
    super(error.message)
    this.name = 'GraphQLRequestError'
    this.status = error.extensions?.originalError?.statusCode
    this.code = error.extensions?.code
  }
}

export const requestGraphQL = async <T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> => {
  const response = await axios.post<GraphQLResponse<T>>(
    '/graphql',
    { query, variables },
    { baseURL: '/' }
  )

  const error = response.data.errors?.[0]
  if (error) throw new GraphQLRequestError(error)
  if (!response.data.data) throw new Error('The server returned no data')

  return response.data.data
}
