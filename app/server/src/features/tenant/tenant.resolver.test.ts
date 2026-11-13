import { describe, expect, it, vi } from 'vitest'
import { Tenant, TenantType } from './schemas/tenant.schema'
import { TenantResolver } from './tenant.resolver'
import { TenantService } from './tenant.service'

vi.mock('./schemas/tenant.schema', () => ({
  Tenant: class Tenant {},
  TenantType: {
    DEFAULT: 'DEFAULT',
    PHOTO: 'PHOTO',
  },
}))

vi.mock('./tenant.service', () => ({
  TenantService: class TenantService {},
}))

vi.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}))

vi.mock('../auth/guards/superadmin.guard', () => ({
  SuperAdminGuard: class SuperAdminGuard {},
}))

describe('TenantResolver', () => {
  const resolver = new TenantResolver({} as TenantService)

  it('returns the stored tenant type', () => {
    expect(resolver.type({ type: TenantType.PHOTO } as Tenant)).toBe(
      TenantType.PHOTO
    )
  })

  it('defaults legacy tenants to the general business type', () => {
    expect(resolver.type({} as Tenant)).toBe(TenantType.DEFAULT)
  })
})
