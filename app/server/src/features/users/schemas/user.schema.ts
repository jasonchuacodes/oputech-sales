import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type UserDocument = HydratedDocument<User>

export enum UserRole {
  SuperAdmin = 'SUPERADMIN',
  Admin = 'ADMIN',
  Staff = 'STAFF',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string

  @Prop({ trim: true })
  fullName?: string

  @Prop({ lowercase: true, trim: true })
  email?: string

  @Prop({ required: true })
  password: string

  @Prop({ enum: UserRole, default: UserRole.Staff })
  role: UserRole

  @Prop({ index: true })
  ownerUserId?: string

  @Prop({ type: [String], default: [], index: true })
  tenantIds: string[]

  @Prop()
  currentTenantId?: string

  @Prop({ required: true, default: 0 })
  tenantSelectionVersion: number
}

export const UserSchema = SchemaFactory.createForClass(User)
