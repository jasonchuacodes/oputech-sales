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
import { Product, ProductDocument } from '../product/schemas/product.schema'
import {
  Transaction,
  TransactionDocument,
} from '../transaction/schemas/transaction.schema'
import { Report, ReportDocument } from '../report/schemas/report.schema'
import {
  Aggregate,
  AggregateDocument,
} from '../report/schemas/aggregate.schema'
import { Tenant, TenantDocument } from './schemas/tenant.schema'
import {
  StockMovement,
  StockMovementDocument,
} from '../stock/schemas/stock-movement.schema'
import {
  AuthenticatedUser,
  CreateTenantInput,
  StockUnitOption,
  UpdateTenantInput,
} from './tenant.types'
import {
  canonicalizeStockUnit,
  isValidStockUnit,
  normalizeStockUnit,
  STOCK_UNIT_MAX_LENGTH,
} from '../stock/stock-unit'

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Aggregate.name)
    private readonly aggregateModel: Model<AggregateDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>
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

  async listStockUnits(tenantId: string): Promise<StockUnitOption[]> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select('stockUnits')
      .exec()
    if (!tenant) {
      throw new NotFoundException('The requested tenant was not found.')
    }
    return (tenant.stockUnits ?? [])
      .map(({ label }) => ({ label }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, undefined, {
          sensitivity: 'base',
        })
      )
  }

  async addStockUnit(
    tenantId: string,
    inputLabel: string
  ): Promise<StockUnitOption> {
    const label = canonicalizeStockUnit(inputLabel ?? '')
    if (!isValidStockUnit(label)) {
      throw new InvalidInputException(
        `Unit names must contain between 1 and ${STOCK_UNIT_MAX_LENGTH} characters and cannot contain control characters.`
      )
    }
    const normalizedLabel = normalizeStockUnit(label)
    const updated = await this.tenantModel
      .findOneAndUpdate(
        {
          _id: tenantId,
          stockUnits: { $not: { $elemMatch: { normalizedLabel } } },
        },
        {
          $push: {
            stockUnits: { label, normalizedLabel, createdAt: new Date() },
          },
        },
        { returnDocument: 'after' }
      )
      .select('stockUnits')
      .exec()
    if (updated) return { label }

    const tenant = await this.tenantModel
      .findById(tenantId)
      .select('stockUnits')
      .exec()
    if (!tenant) {
      throw new NotFoundException('The requested tenant was not found.')
    }
    const existing = (tenant.stockUnits ?? []).find(
      (unit) => unit.normalizedLabel === normalizedLabel
    )
    if (existing) return { label: existing.label }

    throw new ConflictException('The unit could not be added. Please try again.')
  }

  async resolveStockUnit(tenantId: string, inputLabel: string): Promise<string> {
    const normalizedLabel = normalizeStockUnit(inputLabel ?? '')
    if (!normalizedLabel) {
      throw new InvalidInputException('Select a base unit.')
    }
    const tenant = await this.tenantModel
      .findOne({ _id: tenantId, 'stockUnits.normalizedLabel': normalizedLabel })
      .select('stockUnits')
      .exec()
    const option = (tenant?.stockUnits ?? []).find(
      (unit) => unit.normalizedLabel === normalizedLabel
    )
    if (!option) {
      throw new InvalidInputException(
        'Select a base unit from the current tenant options.'
      )
    }
    return option.label
  }

  async create(
    ownerUserId: string,
    input: CreateTenantInput
  ): Promise<TenantDocument> {
    const name = input.name?.trim()
    if (!name || name.length > 80) {
      throw new InvalidInputException(
        'Tenant names must contain between 1 and 80 characters.'
      )
    }

    const tenant = await this.tenantModel.create({ name, ownerUserId })
    await this.userModel.updateOne(
      { _id: ownerUserId, currentTenantId: { $exists: false } },
      {
        $set: { currentTenantId: String(tenant._id) },
        $inc: { tenantSelectionVersion: 1 },
      }
    )
    return tenant
  }

  async update(
    ownerUserId: string,
    tenantId: string,
    input: UpdateTenantInput
  ): Promise<TenantDocument> {
    if (!tenantId || !isValidObjectId(tenantId)) {
      throw new InvalidInputException(
        'A valid tenant is required for this operation.'
      )
    }

    const name = input.name?.trim()
    if (!name || name.length > 80) {
      throw new InvalidInputException(
        'Tenant names must contain between 1 and 80 characters.'
      )
    }

    const tenant = await this.tenantModel
      .findOneAndUpdate(
        { _id: tenantId, ownerUserId },
        { $set: { name } },
        { returnDocument: 'after' }
      )
      .exec()
    if (!tenant) {
      throw new NotFoundException('The requested tenant was not found.')
    }
    return tenant
  }

  async remove(ownerUserId: string, tenantId: string): Promise<boolean> {
    if (!tenantId || !isValidObjectId(tenantId)) {
      throw new InvalidInputException(
        'A valid tenant is required for this operation.'
      )
    }

    const tenant = await this.tenantModel.findOne({
      _id: tenantId,
      ownerUserId,
    })
    if (!tenant)
      throw new NotFoundException('The requested tenant was not found.')

    const [tenantCount, assignedUser] = await Promise.all([
      this.tenantModel.countDocuments({ ownerUserId }),
      this.userModel.exists({ ownerUserId, tenantIds: tenantId }),
    ])
    if (tenantCount <= 1) {
      throw new ConflictException('You must keep at least one tenant.')
    }
    if (assignedUser) {
      throw new ConflictException(
        'Reassign or delete users assigned to this tenant before deleting it.'
      )
    }

    const fallback = await this.tenantModel
      .findOne({ _id: { $ne: tenantId }, ownerUserId })
      .sort({ name: 1 })
      .select('_id')
      .exec()
    if (!fallback) {
      throw new ConflictException('You must keep at least one tenant.')
    }

    await Promise.all([
      this.productModel.deleteMany({ tenantId }),
      this.transactionModel.deleteMany({ tenantId }),
      this.reportModel.deleteMany({ tenantId }),
      this.aggregateModel.deleteMany({ tenantId }),
      this.stockMovementModel.deleteMany({ tenantId }),
    ])
    const result = await this.tenantModel.deleteOne({
      _id: tenantId,
      ownerUserId,
    })
    if (!result.deletedCount) return false

    await this.userModel.updateOne(
      { _id: ownerUserId, currentTenantId: tenantId },
      {
        $set: { currentTenantId: String(fallback._id) },
        $inc: { tenantSelectionVersion: 1 },
      }
    )
    return true
  }

  async assertAccess(
    user: AuthenticatedUser,
    tenantId: string
  ): Promise<TenantDocument> {
    if (!tenantId || !isValidObjectId(tenantId)) {
      throw new InvalidInputException(
        'A valid tenant is required for this operation.'
      )
    }

    const tenant = await this.tenantModel.findById(tenantId).exec()
    if (!tenant)
      throw new NotFoundException('The requested tenant was not found.')

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
    if (!assigned)
      throw new ForbiddenException('You do not have access to this tenant.')
    return tenant
  }

  async select(
    user: AuthenticatedUser,
    tenantId: string,
    expectedVersion: number
  ): Promise<UserDocument> {
    if (user.role === UserRole.Staff) {
      throw new ForbiddenException('Staff accounts cannot switch tenants.')
    }
    await this.assertAccess(user, tenantId)

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: user.userId, tenantSelectionVersion: expectedVersion },
        {
          $set: { currentTenantId: tenantId },
          $inc: { tenantSelectionVersion: 1 },
        },
        { returnDocument: 'after' }
      )
      .select('-password')
      .exec()
    if (!updated) {
      throw new ConflictException(
        'Your tenant selection changed on another device. Please refresh and try again.'
      )
    }
    return updated
  }

  async assertAssignments(
    ownerUserId: string,
    role: UserRole,
    tenantIds: string[]
  ): Promise<void> {
    const uniqueIds = [...new Set(tenantIds)]
    if (role === UserRole.SuperAdmin) {
      throw new InvalidInputException(
        'Super admin accounts cannot be created through user management.'
      )
    }
    if (role === UserRole.Staff && uniqueIds.length !== 1) {
      throw new InvalidInputException(
        'Staff accounts must be assigned to exactly one tenant.'
      )
    }
    if (role === UserRole.Admin && uniqueIds.length < 1) {
      throw new InvalidInputException(
        'Admin accounts must be assigned to at least one tenant.'
      )
    }
    if (uniqueIds.some((id) => !isValidObjectId(id))) {
      throw new InvalidInputException(
        'One or more tenant assignments are invalid.'
      )
    }
    const count = await this.tenantModel.countDocuments({
      _id: { $in: uniqueIds },
      ownerUserId,
    })
    if (count !== uniqueIds.length) {
      throw new ForbiddenException(
        'One or more tenant assignments are not owned by this account.'
      )
    }
  }
}
