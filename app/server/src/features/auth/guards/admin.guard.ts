import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { UserRole } from '../../users/schemas/user.schema'
import { ForbiddenException } from '../../../common/exceptions'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = GqlExecutionContext.create(context).getContext().req
    if (![UserRole.SuperAdmin, UserRole.Admin].includes(request.user?.role)) {
      throw new ForbiddenException(
        'Administrator access is required to perform this action.',
      )
    }
    return true
  }
}
