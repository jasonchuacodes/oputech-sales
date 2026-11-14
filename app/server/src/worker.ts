import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { WorkerAppModule } from './worker-app.module'

process.env.TZ = process.env.TZ ?? 'Asia/Manila'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule)
  app.enableShutdownHooks()
}

void bootstrap()
