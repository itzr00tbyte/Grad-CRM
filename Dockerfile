# SchoolGrads CRM — Production Docker Image
# Multi-stage build for Next.js 15 standalone output
# Usage:
#   docker build -t schoolgrads-crm .
#   docker run -d --name crm -p 3000:3000 --env-file .env.production schoolgrads-crm

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build ─────────────────────────────────────────────────────────────
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Build-time env vars (none sensitive — runtime vars come from .env.production)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone output: only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Scripts needed for init-db, preflight etc. via docker exec
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/schema.sql ./schema.sql
COPY --from=builder --chown=nextjs:nodejs /app/InboxTales_School_Contacts_MASTER.csv* ./

# Production node_modules so scripts can import 'postgres', 'bcryptjs', etc.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# File uploads directory (mounted as a volume in production)
RUN mkdir -p uploads && chown nextjs:nodejs uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
