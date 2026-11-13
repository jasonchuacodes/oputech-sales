import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import toast from 'react-hot-toast'
import { CreateTransactionInput, TransactionFilter } from './transaction.api'
import { TransactionType } from './transaction.types'
import {
  listLocalTransactions,
  queueLocalTransaction,
  queueLocalTransactionDelete,
} from '../../offline/repository'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { notifyOutboxChanged } from '../../context/sync/sync-context'
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { productKeys } from '../product/product.queries'

export const useTransactions = (filter?: TransactionFilter) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  const from = filter?.from
  const to = filter?.to
  const processed = filter?.processed
  const data = useLiveQuery(
    () =>
      tenantId
        ? listLocalTransactions(tenantId, { from, to, processed })
        : Promise.resolve([]),
    [tenantId, from, to, processed]
  )

  return { data, isLoading: data === undefined }
}

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()
  const { auth } = useAuthContext()
  const { currentTenant } = useTenantContext()

  return useMutation({
    networkMode: 'always',
    mutationFn: (input: CreateTransactionInput) => {
      if (!auth?.id) throw new Error('Sign in before creating a transaction')
      if (!currentTenant) throw new Error('Select a tenant first')
      return queueLocalTransaction(input, auth.id, currentTenant.id)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSuccess: (_transaction, input) => {
      toast.success('Transaction saved on this device')
      notifyOutboxChanged()
      if (input.type === TransactionType.Sale) {
        void queryClient.invalidateQueries({
          queryKey: productKeys.tenant(currentTenant?.id),
        })
      }
    },
  })
}

export const useDeleteTransaction = () => {
  const { auth } = useAuthContext()
  const { currentTenant } = useTenantContext()

  return useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => {
      if (!auth?.id) throw new Error('Sign in before deleting a transaction')
      if (!currentTenant) throw new Error('Select a tenant first')
      return queueLocalTransactionDelete(id, auth.id, currentTenant.id)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Transaction deletion saved')
      notifyOutboxChanged()
    },
  })
}
