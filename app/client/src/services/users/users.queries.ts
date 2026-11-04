import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser, updateActivityStatus, resetPassword } from './users.api'
import { CreateUserInput, UpdateUserInput, UpdateActivityStatusInput } from './users.types'
import { useSyncContext } from '../../context/sync/useSyncContext'

export function useUsers() {
  const { canUseOnlineFeatures } = useSyncContext()
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
    enabled: canUseOnlineFeatures,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: (input: CreateUserInput) => {
      if (!canUseOnlineFeatures) throw new Error('User administration requires an online, synced device')
      return createUser(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => {
      if (!canUseOnlineFeatures) throw new Error('User administration requires an online, synced device')
      return updateUser(id, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: (id: string) => {
      if (!canUseOnlineFeatures) throw new Error('User administration requires an online, synced device')
      return deleteUser(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateActivityStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateActivityStatusInput }) =>
      updateActivityStatus(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}

export function useResetPassword() {
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => {
      if (!canUseOnlineFeatures) throw new Error('User administration requires an online, synced device')
      return resetPassword(id, password)
    },
  })
}
