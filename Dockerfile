# syntax=docker/dockerfile:1

# ─── Stage 1: deps ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ─── Stage 2: builder ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas necesarias en build time
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ─── Stage 3: migrator ───────────────────────────────────────
# Imagen mínima para correr drizzle-kit migrate desde el Droplet.
# El Droplet está en red confiable de DO → puede conectarse a DO Managed DB.
# Los runners de GitHub Actions NO están en trusted sources → no pueden.
FROM node:20-alpine AS migrator
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY lib/db ./lib/db
ENV NO_COLOR=1
CMD ["npx", "drizzle-kit", "migrate"]

# ─── Stage 4: runner ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root para compliance (least privilege)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar solo lo necesario para producción
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
