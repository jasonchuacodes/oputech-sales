import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthUser } from './auth.types'
import { getMe, login, logout, register } from './auth.api'

const useGetMe = () => {
  return useQuery<AuthUser | null>({
    queryFn: getMe,
    queryKey: ['auth'],
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

const useRegisterMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

const useLoginMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

const useLogoutMutation = () =>
  useMutation({
    mutationFn: logout,
  })

export { useGetMe, useRegisterMutation, useLoginMutation, useLogoutMutation }
