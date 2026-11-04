import { useAuthContext } from '../../../context/auth/useAuthContext'
import { UserStatus } from '../../../services/users/users.types'
import { useUpdateActivityStatus } from '../../../services/users/users.queries'

export const useCurrentUserActivityStatus = () => {
  const { auth } = useAuthContext()
  const updateActivityStatus = useUpdateActivityStatus()

  const activityStatus = auth?.activityStatus ?? { status: UserStatus.Active }
  const { status, message } = activityStatus

  const setActive = () => {
    if (!auth?.id) return
    updateActivityStatus.mutate({
      id: auth.id,
      input: { status: UserStatus.Active },
    })
  }

  return { status, message, setActive }
}
