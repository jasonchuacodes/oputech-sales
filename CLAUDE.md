# Oputech Sales repository guide

## Structure

This is a pnpm workspace:

- `app/client` — Next.js 16 App Router, React 19, Tailwind 4
- `app/server` — NestJS 10, GraphQL, REST authentication, Mongoose

Run commands from the repository root:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Client architecture

- Keep route files in `app/client/src/app` thin.
- Route-facing UI and behavior live under `src/features`.
- Shared primitives live under `src/components/ui`.
- Use Server Components by default and add `"use client"` at the smallest boundary requiring hooks, browser APIs, or event handlers.
- TanStack Query owns remote state.
- IndexedDB/Dexie owns offline product snapshots, transaction records, outbox operations, and drafts.
- The browser calls same-origin `/api/*` and `/graphql`; `next.config.ts` proxies these requests to NestJS.
- Never cache API or GraphQL responses in the service worker.

## UI rules

- Design mobile-first for a 390px reference width.
- Use bottom navigation on phones, a compact rail on tablets, and a sidebar on wide desktops.
- Inputs and primary buttons are 48px high with 16px input text.
- Prefer background, spacing, and `shadow-xs` over borders for ordinary cards.
- Use bottom sheets for mobile selections and short forms.
- Use responsive cards/lists on phones and tablets; reserve tables for wide desktop.
- Reuse formatting helpers under `src/utils`.

## Verification

Run client typecheck, lint, tests, and build. Run server tests and build. The user performs visual browser verification.
