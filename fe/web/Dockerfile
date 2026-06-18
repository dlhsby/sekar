# syntax=docker/dockerfile:1.7
# SEKAR Web Dashboard - Production Dockerfile
# Multi-stage build for optimized Next.js deployment

# Stage 1: Dependencies
FROM node:24-slim AS deps
WORKDIR /app

# Install dependencies only when needed (--omit=dev; --only was removed in npm 11)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Stage 2: Build
FROM node:24-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install all dependencies (including devDependencies for build)
RUN npm ci

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Which encrypted env to build from: `staging` (CI default) or `production` (on-prem).
ARG DOTENV_ENV=staging

# NEXT_PUBLIC_* are decrypted from the committed (encrypted) .env.${DOTENV_ENV} by
# dotenvx at build time and inlined into the bundle. The private key is passed as a
# BuildKit secret — mounted only for this RUN, never persisted in an image layer.
# It's exposed under both env names so dotenvx picks the one matching the file.
RUN --mount=type=secret,id=dotenv_private_key \
    DOTENV_PRIVATE_KEY_STAGING="$(cat /run/secrets/dotenv_private_key)" \
    DOTENV_PRIVATE_KEY_PRODUCTION="$(cat /run/secrets/dotenv_private_key)" \
    npx dotenvx run -f ".env.${DOTENV_ENV}" -- next build

# Stage 3: Production Runtime
FROM node:24-slim AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Use the image's built-in non-root `node` user (uid 1000) — portable on the
# Debian-slim base without addgroup/adduser syntax differences.

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check — the dashboard has no /api/health route; the login page is an
# always-available public 200 served by the standalone server.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/login', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" || exit 1

# Start application
CMD ["node", "server.js"]
