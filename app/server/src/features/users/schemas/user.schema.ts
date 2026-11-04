import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type UserDocument = HydratedDocument<User>

export enum UserRole {
  User = 'USER',
  Admin = 'ADMIN',
}

export enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export class ActivityStatus {
  status: UserStatus
  message?: string
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

  @Prop({ enum: UserRole, default: UserRole.User })
  role: UserRole

  @Prop({
    type: {
      status: { type: String, enum: UserStatus },
      message: { type: String },
    },
    default: { status: UserStatus.Inactive },
  })
  activityStatus: ActivityStatus
}

export const UserSchema = SchemaFactory.createForClass(User)
