let activeTenantId: string | undefined

export const getActiveTenantId = () => activeTenantId

export const setActiveTenantId = (tenantId?: string) => {
  activeTenantId = tenantId
}
