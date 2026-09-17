# ADR-002: Application Architecture, Test Runner, and Auth Strategy

## Status

Accepted (v1.0)

## Context

We need to deliver working versions v1.0 and v2.0 rapidly. The solution requires a demonstrable interface, an automated CI test pipeline, and distinct user roles (Student and Admin) without spending time on non-essential boilerplate.

## Options Considered

### Option 1: Decoupled Architecture (React SPA + Express/FastAPI + Jest + Full Auth)

- **Framework:** Separate frontend and backend repositories. Requires managing CORS, two build setups, and multiple deployments.
- **Testing:** Jest requires complex Babel configuration and module resolution workarounds to handle modern TypeScript and ES modules.
- **Auth:** Implementing NextAuth, Supabase, or JWT auth requires handling tokens, sessions, and login views, which Section 2.2 explicitly declares out of scope.

### Option 2: Unified Next.js Monolith (Route Handlers + shadcn/ui + Vitest + Mock Auth)

- **Framework:** Next.js App Router combines UI and API Route Handlers in a single repository. Tailwind CSS and shadcn/ui provide immediate copy-paste UI components.
- **Testing:** Vitest provides native TypeScript and ESM support out of the box with zero configuration. It runs significantly faster than Jest and pairs with Supertest for API endpoint testing.
- **Auth:** Mock authentication passing a user identity via a custom request header (`x-user-id`) or a simple UI dropdown.

## Decision

We chose **Option 2: Next.js Monolith with Route Handlers, shadcn/ui, Vitest, and Mock Auth**.

## Consequences

- **Positive:** Single repository; zero configuration overhead for ESM testing; no wasted effort on external login systems; instant UI prototyping.
- **Negative:** Next.js Route Handlers are coupled to the Next.js runtime rather than a standalone Node.js HTTP server; mock auth is not a security boundary and must never be presented as one outside the training environment.

## Review Condition

Revisit if the backend needs to be extracted into independent microservices or if external enterprise SSO is mandated for production.
