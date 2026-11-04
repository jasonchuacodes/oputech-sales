export enum UserRole {
  User = 'USER',
  Admin = 'ADMIN',
}

export enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export interface ActivityStatus {
  status: UserStatus
  message?: string
}

export interface User {
  id: string
  username: string
  fullName?: string
  email?: string
  role: string
  activityStatus: ActivityStatus
}

export interface UpdateActivityStatusInput {
  status: UserStatus
  message?: string
}

export interface CreateUserInput {
  username: string
  fullName?: string
  email?: string
  password: string
  role?: string
}

export interface UpdateUserInput {
  username?: string
  fullName?: string
  email?: string
  role?: string
}

export interface ResetPasswordInput {
  id: string
  password: string
}
