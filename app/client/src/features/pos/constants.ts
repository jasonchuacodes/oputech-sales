export const POS_DRAFT_KEY = 'pos-cart'
export const getPosDraftKey = (tenantId?: string) =>
  tenantId ? `${POS_DRAFT_KEY}:${tenantId}` : POS_DRAFT_KEY
