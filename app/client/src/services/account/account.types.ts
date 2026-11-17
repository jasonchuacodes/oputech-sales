export interface AccountProfile {
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  username: string
  role: string
}

export interface UpdateAccountProfileInput {
  firstName?: string | null
  lastName?: string | null
}
