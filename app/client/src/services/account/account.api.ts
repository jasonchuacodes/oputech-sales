import { requestGraphQL } from '../../lib/graphql'
import { AccountProfile, UpdateAccountProfileInput } from './account.types'

const PROFILE_FIELDS = `
  id
  firstName
  lastName
  fullName
  username
  role
`

const GET_MY_PROFILE = `
  query MyProfile {
    myProfile {
      ${PROFILE_FIELDS}
    }
  }
`

export async function getMyProfile(): Promise<AccountProfile> {
  const data = await requestGraphQL<{ myProfile: AccountProfile }>(
    GET_MY_PROFILE
  )
  return data.myProfile
}

const UPDATE_MY_PROFILE = `
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      ${PROFILE_FIELDS}
    }
  }
`

export async function updateMyProfile(
  input: UpdateAccountProfileInput
): Promise<AccountProfile> {
  const data = await requestGraphQL<{ updateMyProfile: AccountProfile }>(
    UPDATE_MY_PROFILE,
    { input }
  )
  return data.updateMyProfile
}
