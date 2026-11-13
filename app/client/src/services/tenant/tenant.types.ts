export enum TenantType {
  DEFAULT = 'DEFAULT',
  PHOTO = 'PHOTO',
}

export interface Tenant {
  id: string
  name: string
  type: TenantType
}
