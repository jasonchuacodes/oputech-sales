import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getReports,
  getReport,
  createReport,
  deleteReport,
  remit,
} from './report.api'
import { CreateReportInput } from './report.types'
import { useSyncContext } from '../../context/sync/useSyncContext'

export const useReports = () => {
  const { canUseOnlineFeatures } = useSyncContext()
  return useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    enabled: canUseOnlineFeatures,
  })
}

export const useReport = (id?: string) => {
  const { canUseOnlineFeatures } = useSyncContext()
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!),
    enabled: !!id && canUseOnlineFeatures,
  })
}

export const useCreateReport = () => {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures, syncNow } = useSyncContext()
  return useMutation({
    mutationFn: (input: CreateReportInput) => {
      if (!canUseOnlineFeatures) throw new Error('Sync all transactions before generating a report')
      return createReport(input)
    },
    onSuccess: () => {
      toast.success('Report generated successfully!')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      void syncNow()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export const useDeleteReport = () => {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: (id: string) => {
      if (!canUseOnlineFeatures) throw new Error('Reports can only be changed while online and synced')
      return deleteReport(id)
    },
    onSuccess: () => {
      toast.success('Report deleted')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export const useRemit = () => {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: ({ id, isRemitted }: { id: string; isRemitted: boolean }) => {
      if (!canUseOnlineFeatures) throw new Error('Reports can only be changed while online and synced')
      return remit(id, isRemitted)
    },
    onSuccess: (data, variables) => {
      toast.success(variables.isRemitted ? 'Marked as remitted' : 'Marked as not remitted')
      queryClient.setQueryData(['report', variables.id], data)
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
