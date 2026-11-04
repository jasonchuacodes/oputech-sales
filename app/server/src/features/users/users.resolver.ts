import {
  Query,
  Mutation,
  Resolver,
  Args,
} from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  UserRole,
  UserStatus,
} from './schemas/user.schema'

interface CreateUserInput {
  username: string
  fullName?: string
  email?: string
  password: string
  role?: string
}

interface ActivityStatusInput {
  status: string
  message?: string
}

interface UpdateUserInput {
  username?: string
  fullName?: string
  email?: string
  role?: string
}

@UseGuards(JwtAuthGuard)
@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query()
  users() {
    return this.usersService.findAll()
  }

  @Mutation()
  async createUser(@Args('input') input: CreateUserInput) {
    const hashed = await bcrypt.hash(input.password, 10)
    return this.usersService.create({
      username: input.username,
      fullName: input.fullName,
      email: input.email,
      password: hashed,
      role: (input.role as UserRole) ?? UserRole.User,
    })
  }

  @Mutation()
  updateUser(@Args('id') id: string, @Args('input') input: UpdateUserInput) {
    return this.usersService.update(id, {
      username: input.username,
      fullName: input.fullName,
      email: input.email,
      role: input.role as UserRole,
    })
  }

  @Mutation()
  async deleteUser(@Args('id') id: string): Promise<boolean> {
    const result = await this.usersService.remove(id)
    return result !== null
  }

  @Mutation()
  updateActivityStatus(
    @Args('id') id: string,
    @Args('input') input: ActivityStatusInput,
  ) {
    return this.usersService.updateStatus(id, {
      activityStatus: { status: input.status as UserStatus, message: input.message },
    })
  }

  @Mutation()
  async resetPassword(
    @Args('id') id: string,
    @Args('password') password: string,
  ) {
    const hashed = await bcrypt.hash(password, 10)
    return this.usersService.resetPassword(id, hashed)
  }
}
