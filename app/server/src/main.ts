import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { corsMiddleware } from './common/middleware/cors.middleware'
import {
  getValidationErrorDetails,
  InvalidInputException,
} from './common/exceptions'

process.env.TZ = process.env.TZ ?? 'Asia/Manila'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(corsMiddleware())
  app.use(cookieParser())
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new InvalidInputException('Please correct the invalid input fields.', {
          details: getValidationErrorDetails(errors),
        }),
    }),
  )

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0')
}
bootstrap()
