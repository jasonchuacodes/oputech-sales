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
  firstName?: string
  lastName?: string
  fullName?: string
  username: string
  email: string
  role: AppUserRole
  currentTenantId?: string
  tenantSelectionVersion: number
}

export interface LoginResponse {
  user: AuthUser
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
