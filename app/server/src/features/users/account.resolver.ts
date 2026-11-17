import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { AdminGuard } from '../auth/guards/admin.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdateMyProfileDto } from './dto/update-my-profile.dto'
import { UsersService } from './users.service'

@UseGuards(JwtAuthGuard, AdminGuard)
@Resolver('User')
export class AccountResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query()
  myProfile(@Context() context: any) {
    return this.usersService.getMyProfile(context.req.user.userId)
  }

  @Mutation()
  updateMyProfile(
    @Args('input') input: UpdateMyProfileDto,
    @Context() context: any
  ) {
    return this.usersService.updateMyProfile(context.req.user.userId, input)
  }
}
