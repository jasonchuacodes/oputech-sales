import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from './users.api'
import { CreateUserInput, UpdateUserInput } from './users.types'
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { showUserMutationError } from './users.errors'

export function useUsers() {
  const { currentTenant } = useTenantContext()
  return useQuery({
    queryKey: ['users', currentTenant?.id],
    queryFn: getUsers,
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: showUserMutationError,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: showUserMutationError,
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: showUserMutationError,
  })
}

export function useResetPassword() {
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetPassword(id, password),
    onError: showUserMutationError,
  })
}
