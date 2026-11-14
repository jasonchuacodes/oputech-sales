import { Inject, Injectable } from '@nestjs/common'
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  InvalidInputException,
  NotFoundException,
  PayloadTooLargeException,
} from '../../common/exceptions'
import {
  MAX_PRODUCT_TRANSFER_FILE_BYTES,
  PRODUCT_TRANSFER_CONTENT_TYPE,
  PRODUCT_TRANSFER_DOWNLOAD_TTL_SECONDS,
  PRODUCT_TRANSFER_UPLOAD_TTL_SECONDS,
} from './product-transfer.constants'
import { PRODUCT_TRANSFER_CONFIG } from './product-transfer.config'
import { ProductTransferConfig } from './product-transfer.types'

export const PRODUCT_TRANSFER_S3_CLIENT = Symbol('PRODUCT_TRANSFER_S3_CLIENT')

@Injectable()
export class ProductStorageService {
  constructor(
    @Inject(PRODUCT_TRANSFER_S3_CLIENT) private readonly s3: S3Client,
    @Inject(PRODUCT_TRANSFER_CONFIG)
    private readonly config: ProductTransferConfig
  ) {}

  importSourceKey(tenantId: string, jobId: string): string {
    return `tenants/${tenantId}/product-imports/${jobId}/source.xlsx`
  }

  importErrorKey(tenantId: string, jobId: string): string {
    return `tenants/${tenantId}/product-imports/${jobId}/errors.xlsx`
  }

  exportOutputKey(tenantId: string, jobId: string): string {
    return `tenants/${tenantId}/product-exports/${jobId}/products.xlsx`
  }

  async createImportUpload(
    key: string,
    jobId: string
  ): Promise<{
    url: string
    fields: Array<{ name: string; value: string }>
    expiresAt: string
  }> {
    const result = await createPresignedPost(this.s3, {
      Bucket: this.config.bucket,
      Key: key,
      Fields: {
        'Content-Type': PRODUCT_TRANSFER_CONTENT_TYPE,
        'x-amz-meta-transfer-job-id': jobId,
      },
      Conditions: [
        ['content-length-range', 1, MAX_PRODUCT_TRANSFER_FILE_BYTES],
        ['eq', '$Content-Type', PRODUCT_TRANSFER_CONTENT_TYPE],
        ['eq', '$x-amz-meta-transfer-job-id', jobId],
      ],
      Expires: PRODUCT_TRANSFER_UPLOAD_TTL_SECONDS,
    })

    return {
      url: result.url,
      fields: Object.entries(result.fields).map(([name, value]) => ({
        name,
        value,
      })),
      expiresAt: new Date(
        Date.now() + PRODUCT_TRANSFER_UPLOAD_TTL_SECONDS * 1000
      ).toISOString(),
    }
  }

  async verifyImportSource(key: string, jobId: string): Promise<void> {
    try {
      const result = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key })
      )
      if (!result.ContentLength || result.ContentLength < 1) {
        throw new InvalidInputException('The uploaded workbook is empty.')
      }
      if (result.ContentLength > MAX_PRODUCT_TRANSFER_FILE_BYTES) {
        throw new PayloadTooLargeException(
          `The workbook must not exceed ${MAX_PRODUCT_TRANSFER_FILE_BYTES / 1024 / 1024} MiB.`
        )
      }
      if (result.ContentType !== PRODUCT_TRANSFER_CONTENT_TYPE) {
        throw new InvalidInputException('The upload must be an .xlsx workbook.')
      }
      if (result.Metadata?.['transfer-job-id'] !== jobId) {
        throw new InvalidInputException(
          'The uploaded workbook does not belong to this import job.'
        )
      }
    } catch (error) {
      if (
        error instanceof InvalidInputException ||
        error instanceof PayloadTooLargeException
      ) {
        throw error
      }
      if (this.isMissingObject(error)) {
        throw new NotFoundException(
          'The workbook upload was not found. Upload it again before continuing.'
        )
      }
      throw error
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const result = await this.s3.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key })
      )
      if (!result.Body) {
        throw new NotFoundException('The requested workbook was not found.')
      }
      return Buffer.from(await result.Body.transformToByteArray())
    } catch (error) {
      if (error instanceof NotFoundException) throw error
      if (this.isMissingObject(error)) {
        throw new NotFoundException('The requested workbook was not found.')
      }
      throw error
    }
  }

  async upload(key: string, body: Buffer): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: PRODUCT_TRANSFER_CONTENT_TYPE,
        ServerSideEncryption: 'AES256',
      })
    )
  }

  async createDownloadUrl(
    key: string
  ): Promise<{ url: string; expiresAt: string }> {
    const fileName = key.endsWith('/errors.xlsx')
      ? 'product-import-errors.xlsx'
      : 'products.xlsx'
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
        ResponseContentType: PRODUCT_TRANSFER_CONTENT_TYPE,
      }),
      { expiresIn: PRODUCT_TRANSFER_DOWNLOAD_TTL_SECONDS }
    )
    return {
      url,
      expiresAt: new Date(
        Date.now() + PRODUCT_TRANSFER_DOWNLOAD_TTL_SECONDS * 1000
      ).toISOString(),
    }
  }

  private isMissingObject(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('name' in error)) return false
    return error.name === 'NotFound' || error.name === 'NoSuchKey'
  }
}
