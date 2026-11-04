import { UserRole } from '../users/schemas/user.schema'

export interface AuthenticatedUser {
  userId: string
  role: UserRole
}

export interface CreateTenantInput {
  name: string
}
