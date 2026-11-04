import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { Request, Response } from 'express'
import { UsersService } from '../users/users.service'
import { LoginInput, RegisterInput } from './auth.types'
import { UserRole, UserStatus } from '../users/schemas/user.schema'

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
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const match = await bcrypt.compare(input.password, user.password)
    if (!match) throw new UnauthorizedException('Invalid credentials')

    await this.users.updateStatus(String(user._id), {
      activityStatus: { status: UserStatus.Active },
    })

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
        ...user,
      },
    }
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.refresh_token
    if (!token) throw new UnauthorizedException('No refresh token')

    let payload: { sub: string }
    try {
      payload = this.jwt.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    const user = await this.users.findById(payload.sub)
    if (!user) throw new UnauthorizedException('User not found')

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
      activityStatus: user.activityStatus,
    }
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.refresh_token
    if (token) {
      try {
        const payload = this.jwt.verify<{ sub: string }>(token, {
          secret: process.env.JWT_REFRESH_SECRET,
        })
        await this.users.updateStatus(payload.sub, {
          activityStatus: { status: UserStatus.Inactive },
        })
      } catch {
        // Refresh token missing/invalid/expired — still proceed to clear cookies
      }
    }

    res.clearCookie('access_token', cookieOptions)
    res.clearCookie('refresh_token', cookieOptions)
  }

  async register(input: RegisterInput) {
    const existing = await this.users.findByUsername(input.username)
    if (existing) throw new ConflictException('Username already in use')

    const password = await bcrypt.hash(input.password, 10)
    const user = await this.users.create({
      ...input,
      password,
      role: UserRole.Admin,
    })

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }
}
