# ==============================================================================
# Production Multi-Stage Dockerfile for Next.js with Prisma & PostgreSQL
# ==============================================================================

FROM node:22-alpine AS base

# Stage 1: Dependencies installation
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Enable Corepack and pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate

# Copy dependency manifests and configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm exec prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Stage 3: Minimal production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# OpenSSL is required for Prisma Query Engine on Alpine
RUN apk add --no-cache libc6-compat openssl

# Create a non-root system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set directory permissions for Next.js prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma assets (schema & migrations) for database utilities
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
