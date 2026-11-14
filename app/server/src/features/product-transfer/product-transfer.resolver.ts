import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../auth/guards/admin.guard'
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard'
import { TenantId } from '../tenant/decorators/tenant-id.decorator'
import { CreateProductImportUploadDto } from './dto/product-transfer.dto'
import {
  ProductTransferApiService,
  ProductTransferArtifact,
} from './product-transfer-api.service'
import { ProductTransferService } from './product-transfer.service'
import { ProductTransferJobDocument } from './schemas/product-transfer-job.schema'

interface ProductTransferGraphqlContext {
  req: { user: { userId: string } }
}

@UseGuards(JwtAuthGuard, TenantAccessGuard, AdminGuard)
@Resolver('ProductTransferJob')
export class ProductTransferResolver {
  constructor(
    private readonly api: ProductTransferApiService,
    private readonly transfers: ProductTransferService
  ) {}

  @Query()
  productTransferJob(@TenantId() tenantId: string, @Args('id') id: string) {
    return this.transfers.getJob(tenantId, id)
  }

  @Query()
  activeProductTransferJob(@TenantId() tenantId: string) {
    return this.transfers.activeJob(tenantId)
  }

  @Query()
  latestProductTransferJob(@TenantId() tenantId: string) {
    return this.transfers.latestJob(tenantId)
  }

  @Mutation()
  createProductImportUpload(
    @TenantId() tenantId: string,
    @Args('input') input: CreateProductImportUploadDto,
    @Context() context: ProductTransferGraphqlContext
  ) {
    return this.api.createImportUpload(tenantId, context.req.user.userId, input)
  }

  @Mutation()
  queueProductImportValidation(
    @TenantId() tenantId: string,
    @Args('jobId') jobId: string
  ) {
    return this.api.queueValidation(tenantId, jobId)
  }

  @Mutation()
  confirmProductImport(
    @TenantId() tenantId: string,
    @Args('jobId') jobId: string
  ) {
    return this.api.confirmImport(tenantId, jobId)
  }

  @Mutation()
  cancelProductImport(
    @TenantId() tenantId: string,
    @Args('jobId') jobId: string
  ) {
    return this.api.cancelImport(tenantId, jobId)
  }

  @Mutation()
  createProductExport(
    @TenantId() tenantId: string,
    @Context() context: ProductTransferGraphqlContext
  ) {
    return this.api.createExport(tenantId, context.req.user.userId)
  }

  @Mutation()
  createProductTransferDownloadUrl(
    @TenantId() tenantId: string,
    @Args('jobId') jobId: string,
    @Args('artifact') artifact: ProductTransferArtifact
  ) {
    return this.api.createDownloadUrl(tenantId, jobId, artifact)
  }

  @ResolveField('id')
  id(@Parent() job: ProductTransferJobDocument): string {
    return job._id.toString()
  }

  @ResolveField('createdAt')
  createdAt(@Parent() job: ProductTransferJobDocument): string {
    return job.createdAt.toISOString()
  }

  @ResolveField('startedAt')
  startedAt(@Parent() job: ProductTransferJobDocument): string | null {
    return job.startedAt?.toISOString() ?? null
  }

  @ResolveField('completedAt')
  completedAt(@Parent() job: ProductTransferJobDocument): string | null {
    return job.completedAt?.toISOString() ?? null
  }

  @ResolveField('filesExpireAt')
  filesExpireAt(@Parent() job: ProductTransferJobDocument): string | null {
    return job.filesExpireAt?.toISOString() ?? null
  }
}
