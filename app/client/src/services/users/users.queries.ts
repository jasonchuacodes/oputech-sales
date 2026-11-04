import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from './users.api'
import { CreateUserInput, UpdateUserInput } from './users.types'
import { useTenantContext } from '../../context/tenant/useTenantContext'

const showMutationError = (error: unknown) => {
  toast.error(
    error instanceof Error ? error.message : 'The request could not be completed'
  )
}

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
    onError: showMutationError,
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
    onError: showMutationError,
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
    onError: showMutationError,
  })
}

export function useResetPassword() {
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetPassword(id, password),
    onError: showMutationError,
  })
}
