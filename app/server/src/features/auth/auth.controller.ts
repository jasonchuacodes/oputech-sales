import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { ForbiddenException } from '../../common/exceptions'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(
    @Body() input: RegisterDto,
    @Headers('x-superadmin-script-secret') secret: string
  ) {
    const configuredSecret =
      process.env.SUPERADMIN_SCRIPT_SECRET ?? process.env.ADMIN_SCRIPT_SECRET
    if (!secret || secret !== configuredSecret) {
      throw new ForbiddenException(
        'The super admin registration secret is invalid or missing.',
      )
    }
    return this.auth.register(input)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() input: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(input, res)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return this.auth.me(req.user as { userId: string })
  }
}
