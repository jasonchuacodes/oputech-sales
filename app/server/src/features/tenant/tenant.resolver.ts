import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../auth/guards/superadmin.guard'
import { TenantService } from './tenant.service'
import { AuthenticatedUser, CreateTenantInput } from './tenant.types'

@UseGuards(JwtAuthGuard)
@Resolver('Tenant')
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

  @Query()
  tenants(@Context() context: any) {
    return this.tenantService.listForUser(context.req.user as AuthenticatedUser)
  }

  @Mutation()
  @UseGuards(SuperAdminGuard)
  createTenant(@Args('input') input: CreateTenantInput, @Context() context: any) {
    return this.tenantService.create(context.req.user.userId, input)
  }

  @Mutation()
  selectTenant(
    @Args('tenantId') tenantId: string,
    @Args('expectedVersion') expectedVersion: number,
    @Context() context: any,
  ) {
    return this.tenantService.select(
      context.req.user as AuthenticatedUser,
      tenantId,
      expectedVersion,
    )
  }
}
