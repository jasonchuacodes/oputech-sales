import {
  Query,
  Mutation,
  Resolver,
  Args,
  Context,
} from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserRole } from './schemas/user.schema'
import { SuperAdminGuard } from '../auth/guards/superadmin.guard'
import { TenantId } from '../tenant/decorators/tenant-id.decorator'
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard'

interface CreateUserInput {
  username: string
  fullName?: string
  email?: string
  password: string
  role?: string
}

interface UpdateUserInput {
  username?: string
  fullName?: string
  email?: string
  role?: string
}

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query()
  @UseGuards(TenantAccessGuard)
  users(@TenantId() tenantId: string, @Context() context: any) {
    return this.usersService.findAll(context.req.user.userId, tenantId)
  }

  @Mutation()
  @UseGuards(TenantAccessGuard)
  async createUser(
    @TenantId() tenantId: string,
    @Args('input') input: CreateUserInput,
    @Context() context: any,
  ) {
    return this.usersService.createManaged(context.req.user.userId, {
      username: input.username,
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      role: (input.role as UserRole) ?? UserRole.Staff,
      tenantIds: [tenantId],
    })
  }

  @Mutation()
  updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
    @Context() context: any,
  ) {
    return this.usersService.updateManaged(context.req.user.userId, id, {
      username: input.username,
      fullName: input.fullName,
      email: input.email,
      role: input.role as UserRole,
    })
  }

  @Mutation()
  async deleteUser(@Args('id') id: string, @Context() context: any): Promise<boolean> {
    const result = await this.usersService.remove(context.req.user.userId, id)
    return result !== null
  }

  @Mutation()
  async resetPassword(
    @Args('id') id: string,
    @Args('password') password: string,
    @Context() context: any,
  ) {
    return this.usersService.resetPassword(context.req.user.userId, id, password)
  }
}
