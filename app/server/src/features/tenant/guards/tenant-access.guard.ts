import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { TenantService } from '../tenant.service'
import { AuthenticatedUser } from '../tenant.types'

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly tenants: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = GqlExecutionContext.create(context).getContext().req
    const tenantId = request.headers['x-tenant-id']
    await this.tenants.assertAccess(request.user as AuthenticatedUser, tenantId)
    request.tenantId = tenantId
    return true
  }
}
