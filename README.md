# Chat App Monorepo

This is a production-ready monorepo infrastructure for a chat application.

## Structure

```
chat-app/
 ├── apps/
 │   ├── backend/   # Backend application
 │   ├── web/       # Web frontend (Next.js/React ready)
 │   └── mobile/    # Mobile app (React Native ready)
 ├── packages/
 │   ├── shared-types/ # Shared TypeScript types
 │   ├── config/       # Shared configurations (ESLint, Prettier, TSConfig)
 │   └── ui/           # Shared UI component library
 ├── docs/
```

## Tools

- **pnpm workspaces**: For efficient package management.
- **Turborepo**: For high-performance build pipelines.
- **ESLint & Prettier**: Shared linting and formatting.
- **TypeScript**: configured for all packages.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Run development mode:
   ```bash
   pnpm dev
   ```
