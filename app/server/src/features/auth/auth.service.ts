import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { Request, Response } from 'express'
import { UsersService } from '../users/users.service'
import { LoginInput, RegisterInput } from './auth.types'
import { UserRole } from '../users/schemas/user.schema'
import {
  ConflictException,
  UnauthorizedException,
} from '../../common/exceptions'

const isProduction = process.env.NODE_ENV === 'production'

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService
  ) {}

  async login(input: LoginInput, res: Response) {
    const user = await this.users.findByUsername(input.username)
    if (!user) {
      throw new UnauthorizedException(
        'The username or password is incorrect.',
      )
    }

    const match = await bcrypt.compare(input.password, user.password)
    if (!match) {
      throw new UnauthorizedException(
        'The username or password is incorrect.',
      )
    }

    const accessToken = this.jwt.sign({ sub: user._id, role: user.role })

    const refreshToken = this.jwt.sign(
      { sub: user._id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
      }
    )

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        currentTenantId: user.currentTenantId,
        tenantSelectionVersion: user.tenantSelectionVersion,
      },
    }
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.refresh_token
    if (!token) {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      )
    }

    let payload: { sub: string }
    try {
      payload = this.jwt.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      })
    } catch {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      )
    }

    const user = await this.users.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException(
        'This user account is no longer available.',
      )
    }

    const accessToken = this.jwt.sign({ sub: user._id, role: user.role })

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
  }

  async me(payload: { userId: string }) {
    const user = await this.users.findById(payload.userId)
    if (!user) return null
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      currentTenantId: user.currentTenantId,
      tenantSelectionVersion: user.tenantSelectionVersion,
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('access_token', cookieOptions)
    res.clearCookie('refresh_token', cookieOptions)
  }

  async register(input: RegisterInput) {
    const existing = await this.users.findByUsername(input.username)
    if (existing) {
      throw new ConflictException(
        'This username is already in use.',
      )
    }

    const password = await bcrypt.hash(input.password, 10)
    const user = await this.users.create({
      ...input,
      password,
      role: UserRole.SuperAdmin,
    })

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }
}
