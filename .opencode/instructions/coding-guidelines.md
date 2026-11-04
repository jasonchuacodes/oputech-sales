# Opuspaces Coding Guidelines

These rules apply to the Opuspaces pnpm workspace:

```text
app/client  Next.js PWA
app/server  NestJS API
app/codegen.ts
```

Consult the relevant source before making structural or UI changes:

- [`app/client/ARCHITECTURE.md`](../../app/client/ARCHITECTURE.md) for client placement and boundaries.
- [`app/server/ARCHITECTURE.md`](../../app/server/ARCHITECTURE.md) for server placement and boundaries.
- [`docs/design-system-foundations-v1.md`](../../docs/design-system-foundations-v1.md) for frontend design decisions.
- [`docs/scaffold-implementation-plan.md`](../../docs/scaffold-implementation-plan.md) for project architecture decisions.

## General

1. Keep TypeScript strict. Do not use `any`, unsafe casts, or non-null assertions to bypass errors.
2. Prefer clear, direct code over speculative abstractions.
3. Use established project terminology consistently.
4. Validate untrusted input at the boundary. Client validation improves UX but never replaces server validation.
5. Do not edit files under a `generated/` directory.
6. Add dependencies only when the related functionality is being implemented.
7. Do not create empty directories for possible future code.

## Reuse Before Creation

1. Search the owning feature and shared directories before creating a component, hook, utility, schema, service, or GraphQL fragment.
2. Reuse or compose an existing implementation when it already has the same responsibility. Prefer a focused prop or variant over copying it.
3. Check shadcn/ui and `components/ui` before building a new UI primitive.
4. Do not force reuse when it would mix unrelated responsibilities or add feature-specific conditionals to shared code.
5. Keep feature-specific code in its feature. Promote it to shared code only when it is domain-neutral or genuinely reused.

## Project Boundaries

1. Keep browser code in `app/client` and backend code in `app/server`.
2. Do not import server implementations, secrets, Mongoose models, or NestJS modules into the client.
3. Keep shared directories independent of features; features may depend on shared code, not the reverse.
4. A server feature owns its resolver/controller, service, validation, and Mongoose schemas. Other features use its exported service rather than its model.
5. Keep `common` limited to genuinely cross-cutting code; do not use it as a miscellaneous directory.

## GraphQL

1. The merged server `*.gql` files are the source of truth for the application API.
2. Keep root operation declarations and shared scalars or directives in `app/server/src/graphql/schema.gql`.
3. Keep each feature's GraphQL types, inputs, queries, and mutations in `app/server/src/graphql/features/<feature>.gql`; keep resolvers and business implementation in the owning server feature.
4. NestJS and Codegen load `app/server/src/**/*.gql` and merge the files. Do not add manual imports or a custom collation module.
5. Keep client operations under `app/client/src/features/<feature>/graphql/*.graphql` and request only the fields the feature needs.
6. Run `pnpm generate-graphql` after changing server SDL or client operations.
7. Use generated resolver contracts on the server and generated typed documents on the client. Do not duplicate them with handwritten API types.
8. Use bounded pagination for collection queries.
9. Keep authentication endpoints in REST. Use GraphQL for application queries and mutations.

## Validation with Zod

1. Use Zod for runtime validation on both the client and server.
2. Keep schemas with the feature that owns the input and infer their TypeScript types with `z.infer`; do not define the same shape again as a handwritten interface.
3. Use Zod for REST bodies, GraphQL business constraints, environment variables, forms, URL values, stored browser data, and third-party responses.
4. GraphQL generated types provide compile-time safety; Zod provides runtime validation. Neither replaces the other.
5. Map validation failures to stable API or form errors; do not expose raw Zod errors in production.
6. Name client form schemas `<purpose>FormSchema` and their inferred types `<Purpose>FormValues`. Name server input schemas `<purpose>InputSchema` and their inferred types `<Purpose>Input`.
7. Use `@ZodBody(schema)` for route-specific REST body validation. Do not register a global Zod pipe unless request DTOs adopt a runtime schema-metadata convention that lets the pipe select the correct schema.

```ts
import { z } from "zod";

export const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
```

## MongoDB and Numeric Values

1. Use `Types.ObjectId` for MongoDB references internally and GraphQL `ID` strings at the API boundary.
2. Validate IDs before converting or querying them. Keep every property-scoped query and write explicitly scoped.
3. Add indexes for frequent queries and uniqueness rules.
4. Use optimistic concurrency or MongoDB transactions when a workflow requires consistency across concurrent or multi-document writes.
5. Persist domain numeric values with `Schema.Types.Decimal128` / `Types.Decimal128`, including money, rates, readings, consumption, quantities, and totals.
6. Never calculate domain values with JavaScript floating-point arithmetic. Use `decimal.js` and convert to `Decimal128` through canonical decimal strings.
7. Expose decimals through a GraphQL `Decimal` scalar serialized as strings. Never expose BSON objects or convert through JavaScript `number`.
8. Define precision and rounding at the relevant business boundary. Control values such as counts, limits, indexes, and retries may use integers.

## NestJS Backend

1. Keep transport concerns in controllers and resolvers; keep business logic in feature services.
2. Use constructor injection and explicit tokens for interchangeable implementations. Do not construct infrastructure clients inside services.
3. Follow NestJS lifecycle responsibilities:
   - Guards handle authentication, authorization, roles, and property access.
   - Pipes handle Zod validation and input transformation.
   - Interceptors handle cross-cutting concerns such as logging, timing, and response metadata.
   - Exception filters map errors to stable transport responses.
4. Perform authentication and authorization before business services run. Do not repeatedly check tokens, sessions, roles, or raw requests inside service functions.
5. Pass typed, already-authorized identifiers or actor context into services. Services still enforce domain rules and property-scoped database operations.
6. Do not place business workflows or state transitions in guards, interceptors, middleware, decorators, or filters.
7. Throw shared application exceptions from `app/server/src/common/exceptions` in services. Extend an existing HTTP category for new domain-specific error types so status, code, and message responses remain stable.
8. Never throw a bare `Error` from a controller or service or rely on an accidental generic 500 response. Map expected failures to an `ApplicationException` subtype. If the required category does not exist, add an extendable shared exception first. Translate unexpected infrastructure failures to an intentional sanitized exception without exposing the underlying error.
9. Avoid service locators, unnecessary provider scopes, circular dependencies, and `forwardRef` unless there is a demonstrated need.
10. Use Pino for structured logging. Never log passwords, tokens, cookies, contact details, credentials, or full message bodies.
11. Keep REST under `/api` and GraphQL at `/graphql`.
12. Apply repeated HTTP response policy, such as `Cache-Control: no-store`, through a controller-scoped interceptor rather than duplicating header decorators on every endpoint. Use `@HttpCode` only when the contract intentionally differs from Nest's method default.

## Next.js Client

1. Follow the installed Next.js documentation under `node_modules/next/dist/docs/` before using framework-specific patterns.
2. Use Server Components by default and add `"use client"` at the smallest boundary that needs browser behavior.
3. Use TanStack Query for GraphQL server state and `graphql-request` with generated typed documents. Do not add Apollo Client.
4. Keep query keys stable and feature-oriented; invalidate only affected resources after mutations.
5. Use React Hook Form for client forms and connect the feature's Zod form schema through `zodResolver`. Pass the inferred form type to `useForm` so registration, errors, and submission remain typed.
6. Put each route-facing feature screen at `features/<feature>/<screen>/index.tsx`. Colocate its schema and screen-only helpers in the same directory.
7. Reserve `features/<feature>/components` for components shared by multiple screens in that feature; do not nest screen folders there.
8. Keep small single-use form components private and unexported in the screen's `index.tsx` unless extraction improves readability or enables reuse.
9. Reuse hooks from `app/client/src/hooks` when applicable. Keep state local unless related descendants need a colocated context.
10. Prefer state and accessibility behavior already provided by shadcn/Radix components.
11. Format decimal strings for display without using JavaScript numbers for arithmetic.
12. Keep `useDisclosure()` as a named object instead of destructuring its return value, especially when a component owns multiple disclosures. Use domain names such as `actions.open`, `actions.onOpen()`, and `actions.setOpen()` so each state transition remains unambiguous.

```ts
const {
  handleSubmit,
  register,
  reset,
  formState: { errors, isValid },
} = useForm<LoginFormValues>({
  resolver: zodResolver(loginFormSchema),
});
```

## Design and Accessibility

1. Use semantic design tokens; do not place raw hex colors in feature components.
2. Use shadcn/ui for components, Lucide for icons, Inter for operational UI, and DM Serif Display for editorial display text.
3. Support keyboard navigation, visible focus, semantic HTML, and accessible names.
4. Keep touch targets at least 44 by 44 pixels and account for mobile safe areas.
5. Do not communicate status by color alone.
6. Build mobile-first and verify the 390 by 844 reference viewport and smaller screens.
7. Prefer Flexbox for page layouts, vertical or horizontal stacks, and other one-dimensional alignment. Use CSS Grid only when a layout is genuinely two-dimensional, and prefer `gap` for spacing between siblings.

## PWA and Security

1. Never service-worker cache GraphQL, authentication, or other sensitive API data.
2. Do not implement offline writes without explicit conflict and idempotency handling.
3. Prefer secure HTTP-only authentication cookies with coordinated CORS, SameSite, and CSRF protection.
4. Never trust a client-provided property or entity ID without server-side access enforcement.

## Naming and Tests

1. Use descriptive domain names instead of vague abbreviations.
2. Use PascalCase for classes, types, React components, and GraphQL types; use camelCase for functions, variables, and GraphQL fields.
3. Follow Next.js route conventions, NestJS file suffixes, kebab-case React component files, and the existing `useName.ts` hook convention.
4. Name mutations after clear business actions rather than generic operations.
5. Do not add backend unit test files alongside services, controllers, schemas, or utilities. Prefer integration coverage that exercises the application boundary.
6. Keep REST integration tests under `app/server/tests/api`, GraphQL query tests under `app/server/tests/app/queries`, and GraphQL mutation tests under `app/server/tests/app/mutations`.
7. Add integration coverage selectively for domain calculations, state transitions, authorization, Decimal128 serialization and rounding, GraphQL contracts, and bug regressions. Do not create one test file per implementation file.
8. Run the relevant checks before completing a change:

   ```bash
   pnpm generate-graphql
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
