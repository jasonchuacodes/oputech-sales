import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../../lib/api-error'

const USER_MUTATION_ERROR_FALLBACK = 'The request could not be completed'

export const showUserMutationError = (error: unknown) => {
  toast.error(getApiErrorMessage(error, USER_MUTATION_ERROR_FALLBACK))
}
