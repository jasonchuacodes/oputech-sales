import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { UserRole } from '../../users/schemas/user.schema'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = GqlExecutionContext.create(context).getContext().req
    if (request.user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Administrator access required')
    }
    return true
  }
}
