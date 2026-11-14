import { Global, Module } from '@nestjs/common'
import { z } from 'zod'
import { ProductTransferConfig } from './product-transfer.types'

export const PRODUCT_TRANSFER_CONFIG = Symbol('PRODUCT_TRANSFER_CONFIG')

const productTransferEnvironmentSchema = z.object({
  REDIS_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
      'REDIS_URL must use redis:// or rediss://.'
    ),
  AWS_REGION: z.string().trim().min(1),
  AWS_ACCESS_KEY_ID: z.string().trim().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().trim().min(1),
  S3_PRODUCT_TRANSFER_BUCKET: z.string().trim().min(3),
  PRODUCT_TRANSFER_WORKER_CONCURRENCY: z.coerce
    .number()
    .int()
    .min(1)
    .max(4)
    .default(1),
})

const loadProductTransferConfig = (): ProductTransferConfig => {
  const result = productTransferEnvironmentSchema.safeParse(process.env)
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ')
    throw new Error(`Product transfer configuration is invalid: ${fields}`)
  }

  return {
    redisUrl: result.data.REDIS_URL,
    awsRegion: result.data.AWS_REGION,
    bucket: result.data.S3_PRODUCT_TRANSFER_BUCKET,
    workerConcurrency: result.data.PRODUCT_TRANSFER_WORKER_CONCURRENCY,
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PRODUCT_TRANSFER_CONFIG,
      useFactory: loadProductTransferConfig,
    },
  ],
  exports: [PRODUCT_TRANSFER_CONFIG],
})
export class ProductTransferConfigModule {}
