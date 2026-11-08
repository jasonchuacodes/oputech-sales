# Oputech Sales

Mobile-first point of sale and business operations with offline transaction support.

## Development

```bash
pnpm install
pnpm dev
```

The Next.js client runs on port `5173` and proxies `/api` and `/graphql` to the NestJS server on port `3000`.

## Clear the database

Preview the MongoDB data that would be removed:

```bash
pnpm clear-database -- --dry-run
```

Permanently remove every document while preserving collections and indexes:

```bash
pnpm clear-database -- --confirm-clear
```

The command uses `MONGO_URI` from `app/server/.env`.
