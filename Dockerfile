# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# ---------- Dependencies ----------
FROM base AS deps

COPY package.json pnpm-lock.yaml turbo.json pnpm-workspace.yaml ./

COPY apps ./apps
COPY packages ./packages

RUN corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS builder

COPY --from=deps /app /app

# Build ONLY backend (important)
RUN pnpm turbo run build --filter=backend...

# ---------- Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Copy only necessary files
COPY --from=builder /app /app

EXPOSE 5000

CMD ["pnpm", "--filter", "backend", "start"]
