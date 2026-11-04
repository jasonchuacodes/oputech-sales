import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, Model } from 'mongoose'
import {
  ConflictException,
  ForbiddenException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'
import { User, UserDocument, UserRole } from '../users/schemas/user.schema'
import { Tenant, TenantDocument } from './schemas/tenant.schema'
import { AuthenticatedUser, CreateTenantInput } from './tenant.types'

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async listForUser(user: AuthenticatedUser): Promise<TenantDocument[]> {
    let query: Record<string, unknown>
    if (user.role === UserRole.SuperAdmin) {
      query = { ownerUserId: user.userId }
    } else {
      const accountUser = await this.userModel
        .findById(user.userId)
        .select('tenantIds ownerUserId')
        .exec()
      query = {
        _id: { $in: accountUser?.tenantIds ?? [] },
        ownerUserId: accountUser?.ownerUserId,
      }
    }

    return this.tenantModel.find(query).sort({ name: 1 }).exec()
  }

  async create(ownerUserId: string, input: CreateTenantInput): Promise<TenantDocument> {
    const name = input.name?.trim()
    if (!name || name.length > 80) {
      throw new InvalidInputException('Tenant names must contain between 1 and 80 characters.')
    }

    const tenant = await this.tenantModel.create({ name, ownerUserId })
    await this.userModel.updateOne(
      { _id: ownerUserId, currentTenantId: { $exists: false } },
      { $set: { currentTenantId: String(tenant._id) }, $inc: { tenantSelectionVersion: 1 } },
    )
    return tenant
  }

  async assertAccess(user: AuthenticatedUser, tenantId: string): Promise<TenantDocument> {
    if (!tenantId || !isValidObjectId(tenantId)) {
      throw new InvalidInputException('A valid tenant is required for this operation.')
    }

    const tenant = await this.tenantModel.findById(tenantId).exec()
    if (!tenant) throw new NotFoundException('The requested tenant was not found.')

    if (user.role === UserRole.SuperAdmin) {
      if (tenant.ownerUserId !== user.userId) {
        throw new ForbiddenException('You do not have access to this tenant.')
      }
      return tenant
    }

    const assigned = await this.userModel.exists({
      _id: user.userId,
      ownerUserId: tenant.ownerUserId,
      tenantIds: tenantId,
    })
    if (!assigned) throw new ForbiddenException('You do not have access to this tenant.')
    return tenant
  }

  async select(
    user: AuthenticatedUser,
    tenantId: string,
    expectedVersion: number,
  ): Promise<UserDocument> {
    if (user.role === UserRole.Staff) {
      throw new ForbiddenException('Staff accounts cannot switch tenants.')
    }
    await this.assertAccess(user, tenantId)

    const updated = await this.userModel.findOneAndUpdate(
      { _id: user.userId, tenantSelectionVersion: expectedVersion },
      { $set: { currentTenantId: tenantId }, $inc: { tenantSelectionVersion: 1 } },
      { returnDocument: 'after' },
    ).select('-password').exec()
    if (!updated) {
      throw new ConflictException('Your tenant selection changed on another device. Please refresh and try again.')
    }
    return updated
  }

  async assertAssignments(ownerUserId: string, role: UserRole, tenantIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(tenantIds)]
    if (role === UserRole.SuperAdmin) {
      throw new InvalidInputException('Super admin accounts cannot be created through user management.')
    }
    if (role === UserRole.Staff && uniqueIds.length !== 1) {
      throw new InvalidInputException('Staff accounts must be assigned to exactly one tenant.')
    }
    if (role === UserRole.Admin && uniqueIds.length < 1) {
      throw new InvalidInputException('Admin accounts must be assigned to at least one tenant.')
    }
    if (uniqueIds.some((id) => !isValidObjectId(id))) {
      throw new InvalidInputException('One or more tenant assignments are invalid.')
    }
    const count = await this.tenantModel.countDocuments({
      _id: { $in: uniqueIds },
      ownerUserId,
    })
    if (count !== uniqueIds.length) {
      throw new ForbiddenException('One or more tenant assignments are not owned by this account.')
    }
  }
}
