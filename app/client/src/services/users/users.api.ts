import { requestGraphQL } from '../../lib/graphql'
import { User, CreateUserInput, UpdateUserInput, UpdateActivityStatusInput } from './users.types'

const GET_USERS = `
  query GetUsers {
    users {
      id
      username
      fullName
      email
      role
      activityStatus {
        status
        message
      }
    }
  }
`

export async function getUsers(): Promise<User[]> {
  const data = await requestGraphQL<{ users: User[] }>(GET_USERS)
  return data.users
}

const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      username
      fullName
      email
      role
    }
  }
`
export async function createUser(input: CreateUserInput): Promise<User> {
  const data = await requestGraphQL<{ createUser: User }>(CREATE_USER, { input })
  return data.createUser
}

const UPDATE_USER = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      username
      fullName
      email
      role
    }
  }
`

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const data = await requestGraphQL<{ updateUser: User }>(UPDATE_USER, {
    id,
    input,
  })
  return data.updateUser
}

const DELETE_USER = `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

export async function deleteUser(id: string): Promise<boolean> {
  const data = await requestGraphQL<{ deleteUser: boolean }>(DELETE_USER, { id })
  return data.deleteUser
}

const UPDATE_ACTIVITY_STATUS = `
  mutation UpdateActivityStatus($id: ID!, $input: ActivityStatusInput!) {
    updateActivityStatus(id: $id, input: $input) {
      id
      activityStatus {
        status
        message
      }
    }
  }
`

export async function updateActivityStatus(id: string, input: UpdateActivityStatusInput): Promise<User> {
  const data = await requestGraphQL<{ updateActivityStatus: User }>(
    UPDATE_ACTIVITY_STATUS,
    { id, input }
  )
  return data.updateActivityStatus
}

const RESET_PASSWORD = `
  mutation ResetPassword($id: ID!, $password: String!) {
    resetPassword(id: $id, password: $password) {
      id
    }
  }
`

export async function resetPassword(id: string, password: string): Promise<User> {
  const data = await requestGraphQL<{ resetPassword: User }>(RESET_PASSWORD, {
    id,
    password,
  })
  return data.resetPassword
}
