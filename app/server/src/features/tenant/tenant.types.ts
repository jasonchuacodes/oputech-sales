import { UserRole } from '../users/schemas/user.schema'
import { TenantType } from './schemas/tenant.schema'

export interface AuthenticatedUser {
  userId: string
  role: UserRole
}

export interface CreateTenantInput {
  name: string
  type: TenantType
}

export interface UpdateTenantInput {
  name: string
  type: TenantType
}

export interface StockUnitOption {
  label: string
}
