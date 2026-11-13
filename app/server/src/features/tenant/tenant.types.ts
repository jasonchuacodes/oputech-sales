import { UserRole } from '../users/schemas/user.schema'

export interface AuthenticatedUser {
  userId: string
  role: UserRole
}

export interface CreateTenantInput {
  name: string
}

export interface UpdateTenantInput {
  name: string
}

export interface StockUnitOption {
  label: string
}
