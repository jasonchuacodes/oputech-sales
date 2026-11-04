export enum UserRole {
  SuperAdmin = 'SUPERADMIN',
  Admin = 'ADMIN',
  Staff = 'STAFF',
}

export interface User {
  id: string
  username: string
  fullName?: string
  email?: string
  role: string
  tenantIds: string[]
  currentTenantId?: string
  tenantSelectionVersion: number
}

export interface CreateUserInput {
  username: string
  fullName?: string
  email?: string
  password: string
  role: string
  tenantIds: string[]
}

export interface UpdateUserInput {
  username?: string
  fullName?: string
  email?: string
  role?: string
  tenantIds?: string[]
}

export interface ResetPasswordInput {
  id: string
  password: string
}
