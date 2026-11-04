import { requestGraphQL } from '../../lib/graphql'
import { AuthUser } from '../auth/auth.types'
import { Tenant } from './tenant.types'

const TENANTS = `query Tenants { tenants { id name } }`
const CREATE_TENANT = `
  mutation CreateTenant($input: CreateTenantInput!) {
    createTenant(input: $input) { id name }
  }
`
const SELECT_TENANT = `
  mutation SelectTenant($tenantId: ID!, $expectedVersion: Int!) {
    selectTenant(tenantId: $tenantId, expectedVersion: $expectedVersion) {
      id username email role currentTenantId tenantSelectionVersion
    }
  }
`

export const getTenants = async (): Promise<Tenant[]> => {
  const data = await requestGraphQL<{ tenants: Tenant[] }>(TENANTS)
  return data.tenants
}

export const createTenant = async (name: string): Promise<Tenant> => {
  const data = await requestGraphQL<{ createTenant: Tenant }>(CREATE_TENANT, {
    input: { name },
  })
  return data.createTenant
}

export const selectTenant = async (
  tenantId: string,
  expectedVersion: number,
): Promise<AuthUser> => {
  const data = await requestGraphQL<{ selectTenant: AuthUser }>(SELECT_TENANT, {
    tenantId,
    expectedVersion,
  })
  return data.selectTenant
}
