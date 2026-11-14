import { ProductTransferConfig } from './product-transfer.types'

export const createProductTransferRedisConnection = (
  config: ProductTransferConfig,
  worker: boolean
) => {
  const url = new URL(config.redisUrl)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: decodeURIComponent(url.username || 'default'),
    password: decodeURIComponent(url.password),
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: worker ? null : 1,
    enableOfflineQueue: worker,
  }
}
