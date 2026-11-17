import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './schemas/user.schema'
import { UsersService } from './users.service'
import { UsersResolver } from './users.resolver'
import { TenantModule } from '../tenant/tenant.module'
import { AdminGuard } from '../auth/guards/admin.guard'
import { AccountResolver } from './account.resolver'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TenantModule,
  ],
  providers: [UsersService, UsersResolver, AccountResolver, AdminGuard],
  exports: [UsersService],
})
export class UsersModule {}
