import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CreateTransactionInput, TransactionFilter } from './transaction.api'
import {
  listLocalTransactions,
  queueLocalTransaction,
  queueLocalTransactionDelete,
} from '../../offline/repository'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { notifyOutboxChanged } from '../../context/sync/sync-context'

export const useTransactions = (filter?: TransactionFilter) =>
  useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => listLocalTransactions(filter),
    networkMode: 'always',
  })

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()
  const { auth } = useAuthContext()

  return useMutation({
    networkMode: 'always',
    mutationFn: (input: CreateTransactionInput) => {
      if (!auth?.id) throw new Error('Sign in before creating a transaction')
      return queueLocalTransaction(input, auth.id)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Transaction saved on this device')
      notifyOutboxChanged()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient()
  const { auth } = useAuthContext()

  return useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => {
      if (!auth?.id) throw new Error('Sign in before deleting a transaction')
      return queueLocalTransactionDelete(id, auth.id)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Transaction deletion saved')
      notifyOutboxChanged()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
