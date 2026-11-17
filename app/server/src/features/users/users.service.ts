import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from './schemas/user.schema'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { ConflictException, NotFoundException } from '../../common/exceptions'
import { TenantService } from '../tenant/tenant.service'
import { UserRole } from './schemas/user.schema'
import * as bcrypt from 'bcrypt'
import { UpdateMyProfileDto } from './dto/update-my-profile.dto'

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private user: Model<UserDocument>,
    private readonly tenants: TenantService
  ) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.user.findById(id).select('-password').exec()
  }

  findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.user.findById(id).exec()
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.user.findOne({ email }).exec()
  }

  findByUsername(username: string): Promise<UserDocument | null> {
    return this.user.findOne({ username }).exec()
  }

  findAll(ownerUserId: string, tenantId: string): Promise<UserDocument[]> {
    return this.user
      .find({ ownerUserId, tenantIds: tenantId })
      .select('-password')
      .exec()
  }

  create(input: CreateUserDto): Promise<UserDocument> {
    return this.user.create(input)
  }

  async getMyProfile(id: string): Promise<UserDocument> {
    const user = await this.findById(id)
    if (!user) throw new NotFoundException('The requested user was not found.')
    return user
  }

  async updateMyProfile(
    id: string,
    input: UpdateMyProfileDto
  ): Promise<UserDocument> {
    const current = await this.user.findById(id).select('-password').exec()
    if (!current)
      throw new NotFoundException('The requested user was not found.')

    const normalizeName = (value?: string | null) => value?.trim() || undefined
    const firstName =
      input.firstName === undefined
        ? current.firstName
        : normalizeName(input.firstName)
    const lastName =
      input.lastName === undefined
        ? current.lastName
        : normalizeName(input.lastName)
    const fullName =
      [firstName, lastName].filter(Boolean).join(' ') || undefined
    const $set: Record<string, string> = {}
    const $unset: Record<string, 1> = {}

    for (const [field, value] of Object.entries({
      firstName,
      lastName,
      fullName,
    })) {
      if (value) $set[field] = value
      else $unset[field] = 1
    }

    const user = await this.user
      .findByIdAndUpdate(
        id,
        { $set, $unset },
        { returnDocument: 'after', runValidators: true }
      )
      .select('-password')
      .exec()
    if (!user) throw new NotFoundException('The requested user was not found.')
    return user
  }

  async updatePassword(id: string, password: string): Promise<void> {
    const result = await this.user.updateOne(
      { _id: id },
      { $set: { password }, $inc: { credentialVersion: 1 } }
    )
    if (!result.matchedCount) {
      throw new NotFoundException('The requested user was not found.')
    }
  }

  async createManaged(
    ownerUserId: string,
    input: CreateUserDto
  ): Promise<UserDocument> {
    const role = input.role ?? UserRole.Staff
    const tenantIds = [...new Set(input.tenantIds ?? [])]
    await this.tenants.assertAssignments(ownerUserId, role, tenantIds)
    const existing = await this.findByUsername(input.username)
    if (existing)
      throw new ConflictException('This username is already in use.')
    const password = await bcrypt.hash(input.password, 10)
    try {
      return await this.user.create({
        ...input,
        password,
        role,
        ownerUserId,
        tenantIds,
        currentTenantId: tenantIds[0],
        tenantSelectionVersion: 0,
      })
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('This username is already in use.')
      }
      throw error
    }
  }

  async updateManaged(
    ownerUserId: string,
    id: string,
    input: UpdateUserDto
  ): Promise<UserDocument> {
    const target = await this.user.findOne({ _id: id, ownerUserId }).exec()
    if (!target)
      throw new NotFoundException('The requested user was not found.')
    const role = input.role ?? target.role
    const tenantIds = target.tenantIds
    await this.tenants.assertAssignments(ownerUserId, role, tenantIds)
    const currentTenantId = tenantIds.includes(target.currentTenantId)
      ? target.currentTenantId
      : tenantIds[0]
    try {
      return await this.user
        .findByIdAndUpdate(
          id,
          {
            $set: { ...input, role, tenantIds, currentTenantId },
            $inc: { tenantSelectionVersion: 1 },
          },
          { returnDocument: 'after' }
        )
        .select('-password')
        .exec()
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('This username is already in use.')
      }
      throw error
    }
  }

  async resetPassword(
    ownerUserId: string,
    id: string,
    password: string
  ): Promise<UserDocument | null> {
    const hashedPassword = await bcrypt.hash(password, 10)
    return this.user
      .findOneAndUpdate(
        { _id: id, ownerUserId },
        {
          $set: { password: hashedPassword },
          $inc: { credentialVersion: 1 },
        },
        { returnDocument: 'after' }
      )
      .select('-password')
      .exec()
  }

  remove(ownerUserId: string, id: string): Promise<UserDocument | null> {
    return this.user.findOneAndDelete({ _id: id, ownerUserId }).exec()
  }
}
