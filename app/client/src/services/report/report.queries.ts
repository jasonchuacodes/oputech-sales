import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getReports,
  getReport,
  createReport,
  deleteReport,
  remit,
  getReportsPage,
} from './report.api'
import { CreateReportInput, ReportsPageParams } from './report.types'
import { useSyncContext } from '../../context/sync/useSyncContext'
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { countPendingOutboxOperations } from '../../offline/database'

export const useReports = () => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: ['reports', tenantId],
    queryFn: () => getReports(tenantId),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  })
}

export const useReportsPage = (params: ReportsPageParams) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: ['reports', tenantId, 'page', params],
    queryFn: () => getReportsPage(params, tenantId),
    enabled: !!tenantId,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

export const useReport = (id?: string) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: ['report', tenantId, id],
    queryFn: () => getReport(id!, tenantId),
    enabled: !!id && !!tenantId,
    staleTime: 60 * 1000,
  })
}

export const useCreateReport = () => {
  const queryClient = useQueryClient()
  const { auth } = useAuthContext()
  const { canGenerateReport, refreshInBackground } = useSyncContext()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: CreateReportInput) => {
      if (!canGenerateReport) {
        throw new Error('Sync all transactions before generating a report')
      }
      if (!tenantId) throw new Error('Select a tenant before generating a report')
      if (!auth?.id) throw new Error('Sign in before generating a report')
      if ((await countPendingOutboxOperations(auth.id, tenantId)) > 0) {
        throw new Error('Sync all transactions before generating a report')
      }
      return createReport(input, tenantId)
    },
    onSuccess: () => {
      toast.success('Report generated successfully!')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      void refreshInBackground()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export const useDeleteReport = () => {
  const queryClient = useQueryClient()
  const { auth } = useAuthContext()
  const { canGenerateReport, refreshInBackground } = useSyncContext()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!canGenerateReport) {
        throw new Error('Sync all transactions before deleting a report')
      }
      if (!tenantId) throw new Error('Select a tenant before deleting a report')
      if (!auth?.id) throw new Error('Sign in before deleting a report')
      if ((await countPendingOutboxOperations(auth.id, tenantId)) > 0) {
        throw new Error('Sync all transactions before deleting a report')
      }
      return deleteReport(id, tenantId)
    },
    onSuccess: (_, id) => {
      toast.success('Report deleted')
      queryClient.removeQueries({ queryKey: ['report', tenantId, id], exact: true })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      void refreshInBackground()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export const useRemit = () => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, isRemitted }: { id: string; isRemitted: boolean }) =>
      remit(id, isRemitted, tenantId),
    onSuccess: (data, variables) => {
      toast.success(variables.isRemitted ? 'Marked as remitted' : 'Marked as not remitted')
      queryClient.setQueryData(['report', tenantId, variables.id], data)
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
