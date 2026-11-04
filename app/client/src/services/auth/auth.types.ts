import { UserRole as AppUserRole } from '../../types'
import { ActivityStatus } from '../users/users.types'

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

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
  activityStatus: ActivityStatus
}

export interface LoginResponse {
  user: AuthUser
}
