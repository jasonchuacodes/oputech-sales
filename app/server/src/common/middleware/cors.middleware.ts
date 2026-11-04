import cors, { CorsOptions } from 'cors';

export const corsMiddleware = () => {
  const whitelist = [process.env.CLIENT_URL as string];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };

  return cors(corsOptions);
};
