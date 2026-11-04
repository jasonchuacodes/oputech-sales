import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from './schemas/user.schema'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateUserStatusDto } from './dto/update-user-status.dto'

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private user: Model<UserDocument>) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.user.findById(id).select('-password').exec()
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.user.findOne({ email }).exec()
  }

  findByUsername(username: string): Promise<UserDocument | null> {
    return this.user.findOne({ username }).exec()
  }

  findAll(): Promise<UserDocument[]> {
    return this.user.find().select('-password').exec()
  }

  create(input: CreateUserDto): Promise<UserDocument> {
    return this.user.create(input)
  }

  update(id: string, input: UpdateUserDto): Promise<UserDocument | null> {
    return this.user
      .findByIdAndUpdate(id, input, { returnDocument: 'after' })
      .select('-password')
      .exec()
  }

  updateStatus(id: string, input: UpdateUserStatusDto): Promise<UserDocument | null> {
    return this.user
      .findByIdAndUpdate(id, { activityStatus: input.activityStatus }, { returnDocument: 'after' })
      .select('-password')
      .exec()
  }

  resetPassword(id: string, hashedPassword: string): Promise<UserDocument | null> {
    return this.user
      .findByIdAndUpdate(id, { password: hashedPassword }, { returnDocument: 'after' })
      .select('-password')
      .exec()
  }

  remove(id: string): Promise<UserDocument | null> {
    return this.user.findByIdAndDelete(id).exec()
  }
}
