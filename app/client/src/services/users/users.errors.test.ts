import toast from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '../../lib/graphql'
import { showUserMutationError } from './users.errors'

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('showUserMutationError', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
  })

  it('displays the backend message for a username conflict', () => {
    const error = new GraphQLRequestError({
      message: 'This username is already in use.',
      extensions: { code: 'CONFLICT', status: 409 },
    })

    showUserMutationError(error)

    expect(toast.error).toHaveBeenCalledWith(
      'This username is already in use.'
    )
  })

  it('uses a readable fallback for an unknown failure', () => {
    showUserMutationError({})

    expect(toast.error).toHaveBeenCalledWith(
      'The request could not be completed'
    )
  })
})
