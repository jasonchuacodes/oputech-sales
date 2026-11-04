import { UserRole as AppUserRole } from '../../types'

export interface LoginInput {
  username: string
  password: string
}

export interface RegisterInput {
  username: string
  password: string
}

export interface AuthUser {
  id: string
  username: string
  email: string
  role: AppUserRole
  currentTenantId?: string
  tenantSelectionVersion: number
}

export interface LoginResponse {
  user: AuthUser
}
