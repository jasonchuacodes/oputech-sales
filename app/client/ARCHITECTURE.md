# Client architecture

The client uses Next.js App Router with feature-owned screens and client boundaries around interactive/offline behavior.

```text
src/
├── app/          # Routes, layouts, metadata, manifest
├── components/   # Shared UI primitives
├── context/      # Authentication and synchronization providers
├── features/     # Route-facing domain screens
├── offline/      # IndexedDB repository and outbox synchronization
├── services/     # REST/GraphQL APIs and TanStack Query hooks
├── providers/    # Root client providers
└── utils/        # Formatting and generic helpers
```

The NestJS application remains the backend. Next.js rewrites keep browser requests same-origin. Authentication and route protection remain client-aware so a previously validated user can continue offline.
