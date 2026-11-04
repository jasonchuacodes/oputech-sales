import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from '../users/schemas/user.schema'
import { SuperAdminGuard } from '../auth/guards/superadmin.guard'
import { Tenant, TenantSchema } from './schemas/tenant.schema'
import { TenantAccessGuard } from './guards/tenant-access.guard'
import { TenantResolver } from './tenant.resolver'
import { TenantService } from './tenant.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [TenantService, TenantResolver, TenantAccessGuard, SuperAdminGuard],
  exports: [TenantService, TenantAccessGuard, SuperAdminGuard],
})
export class TenantModule {}
