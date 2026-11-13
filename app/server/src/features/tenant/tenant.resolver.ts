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
import { SuperAdminGuard } from '../auth/guards/superadmin.guard'
import { TenantService } from './tenant.service'
import {
  AuthenticatedUser,
  CreateTenantInput,
  UpdateTenantInput,
} from './tenant.types'
import { Tenant, TenantType } from './schemas/tenant.schema'

@UseGuards(JwtAuthGuard)
@Resolver('Tenant')
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

  @ResolveField('type')
  type(@Parent() tenant: Tenant): TenantType {
    return tenant.type ?? TenantType.DEFAULT
  }

  @Query()
  tenants(@Context() context: any) {
    return this.tenantService.listForUser(context.req.user as AuthenticatedUser)
  }

  @Mutation()
  @UseGuards(SuperAdminGuard)
  createTenant(
    @Args('input') input: CreateTenantInput,
    @Context() context: any
  ) {
    return this.tenantService.create(context.req.user.userId, input)
  }

  @Mutation()
  @UseGuards(SuperAdminGuard)
  updateTenant(
    @Args('tenantId') tenantId: string,
    @Args('input') input: UpdateTenantInput,
    @Context() context: any
  ) {
    return this.tenantService.update(context.req.user.userId, tenantId, input)
  }

  @Mutation()
  @UseGuards(SuperAdminGuard)
  deleteTenant(@Args('tenantId') tenantId: string, @Context() context: any) {
    return this.tenantService.remove(context.req.user.userId, tenantId)
  }

  @Mutation()
  selectTenant(
    @Args('tenantId') tenantId: string,
    @Args('expectedVersion') expectedVersion: number,
    @Context() context: any
  ) {
    return this.tenantService.select(
      context.req.user as AuthenticatedUser,
      tenantId,
      expectedVersion
    )
  }
}
