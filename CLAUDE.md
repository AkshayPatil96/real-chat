# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a production-ready monorepo chat application with a Node.js/Express backend (MongoDB, Redis, Socket.io), React web frontend (Vite), and React Native mobile app scaffold. Uses pnpm workspaces and Turborepo for build orchestration.

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages (respects turbo.json dependency order)
pnpm build

# Run all apps in development mode
pnpm dev

# Run specific app
pnpm dev:backend   # Backend on port typically 3001
pnpm dev:web       # Web frontend

# Lint all packages
pnpm lint

# Type check all packages
pnpm turbo run check-types

# Run tests
pnpm test                    # All packages
pnpm --filter backend test   # Backend only
pnpm --filter web test      # Web only (Vitest)
pnpm --filter backend test --watch  # Watch mode (backend)

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

## Architecture

### Monorepo Structure

```
apps/
├── backend/     # Express API server (MongoDB, Redis, Socket.io)
├── web/         # React SPA (Vite + React 19 + Tailwind CSS v4)
└── mobile/      # React Native (scaffold only)

packages/
├── api-core/        # Shared API client for web (endpoints, HTTP utilities)
├── shared-types/    # TypeScript types shared across apps
├── ui/              # Shared UI component library
└── config/          # Shared ESLint + Prettier configurations
```

### Backend Architecture (apps/backend)

- **Express** with modular route structure under `src/modules/`
- **Modules**: `users`, `conversations`, `messages`, `chat-requests`, `presence`, `uploads`, `webhooks`
- **Auth**: Clerk middleware (`@clerk/express`) - webhook routes must use `express.raw()` before Clerk middleware
- **Database**: MongoDB (Mongoose) + Redis for caching/sessions
- **Real-time**: Socket.io for presence and messaging
- **File uploads**: AWS S3 with presigned URLs
- **Security**: Helmet, rate limiting (Redis store), CORS, HPP, mongo-sanitize
- **Observability**: Sentry (error tracking), Pino (structured logging), Prometheus metrics at `/metrics`
- **API docs**: Swagger UI at `/api-docs`

### Web Frontend Architecture (apps/web)

- **Vite** + React 19 with TypeScript
- **Routing**: React Router v7
- **State**: Redux Toolkit
- **Auth**: Clerk (`@clerk/clerk-react`)
- **UI**: Radix UI primitives + Tailwind CSS v4 (CSS-first configuration)
- **Real-time**: Socket.io client for live features
- **API Client**: Uses `@repo/api-core` package

### Key Files

- `turbo.json` - Turborepo pipeline configuration (build depends on ^build)
- `apps/backend/src/app.ts` - Express app setup with middleware ordering
- `apps/backend/src/server.ts` - Server entry point
- `packages/api-core/src/index.ts` - API client exported to web

## Environment Variables

Backend requires `.env` file (see `apps/backend/.env.example`). Key variables:
- `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `AWS_*` - S3 bucket configuration for uploads

## Notes

- Webhook routes in `app.ts` MUST be registered before `express.json()` middleware to preserve raw body for signature verification
- Backend uses Jest with `mongodb-memory-server` for testing (in-memory MongoDB)
- Web uses Vitest with MSW for API mocking
- Docker compose available at `apps/backend/docker-compose.yml` for local infrastructure
