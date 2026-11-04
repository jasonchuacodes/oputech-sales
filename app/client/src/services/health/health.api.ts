import apiClient from '../../lib/axios'
import { HealthResponse } from './health.types'

export const getHealth = (): Promise<HealthResponse> =>
  apiClient.get<HealthResponse>('/health').then((res) => res.data)
