# syntax=docker/dockerfile:1
# Multi-stage production image for The Ant Adventures CRM (Next.js 16 standalone).

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependencies ---
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --- Database migrations ---
# Reuse the locked project CLI dependencies without compiling the application.
FROM deps AS migrator
COPY supabase ./supabase

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are inlined at build time — pass via --build-arg / compose args.
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ARG NEXT_PUBLIC_USE_SUPABASE=true
ARG NEXT_PUBLIC_SUPABASE_AUTO_SYNC=true
ARG NEXT_PUBLIC_SUPABASE_READ_ONLY=false
ARG NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY=
ARG NEXT_PUBLIC_APP_NAME="The Ant Adventures CRM"
ARG NEXT_PUBLIC_APP_VERSION=4.3

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_USE_SUPABASE=$NEXT_PUBLIC_USE_SUPABASE \
    NEXT_PUBLIC_SUPABASE_AUTO_SYNC=$NEXT_PUBLIC_SUPABASE_AUTO_SYNC \
    NEXT_PUBLIC_SUPABASE_READ_ONLY=$NEXT_PUBLIC_SUPABASE_READ_ONLY \
    NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY=$NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

RUN npm run lint && npm run typecheck && npm run build

# Explicit CI target: keeps verification on the same Node version and dependency
# graph that produces the runtime image.
FROM builder AS verifier

# --- Runtime ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3006 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=1536

# System libs for @sparticuz/chromium (proposal / pricing PDF export).
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3006

CMD ["node", "server.js"]
