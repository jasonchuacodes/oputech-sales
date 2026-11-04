import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ForbiddenException } from '../../../common/exceptions'
import { UserRole } from '../../users/schemas/user.schema'

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = GqlExecutionContext.create(context).getContext().req
    if (request.user?.role !== UserRole.SuperAdmin) {
      throw new ForbiddenException('Only a super admin can perform this action.')
    }
    return true
  }
}
