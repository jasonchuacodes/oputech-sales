import cors, { CorsOptions } from 'cors'

export const corsMiddleware = () => {
  const whitelist: (string | RegExp)[] =
    process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
        ? [process.env.CLIENT_URL]
        : []
      : [/^https?:\/\/localhost(?::\d+)?$/]

  const corsOptions: CorsOptions = {
    origin: whitelist,
    credentials: true,
  }

  return cors(corsOptions)
}
