import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthUser } from '../auth/auth.types'
import { getMyProfile, updateMyProfile } from './account.api'
import { UpdateAccountProfileInput } from './account.types'

const profileQueryKey = ['account', 'profile'] as const

export function useMyProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: getMyProfile,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAccountProfileInput) => updateMyProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
      queryClient.setQueryData<AuthUser | null>(['auth'], (auth) =>
        auth
          ? {
              ...auth,
              firstName: profile.firstName ?? undefined,
              lastName: profile.lastName ?? undefined,
              fullName: profile.fullName ?? undefined,
            }
          : auth
      )
    },
  })
}
