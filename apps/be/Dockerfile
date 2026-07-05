# SEKAR Backend - Production Multi-Stage Dockerfile
# Build: docker build -t sekar-backend .
# Run: docker run -p 3000:3000 --env-file .env.production sekar-backend

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:24-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# =============================================================================
# Stage 3: Runner (Production)
# =============================================================================
FROM node:24-alpine AS runner

# Set NODE_ENV
ENV NODE_ENV=production

WORKDIR /app

# Chromium for headless PDF report generation (puppeteer-core). Use the system
# Chromium from Alpine repos — puppeteer-core ships no bundled browser.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_DOWNLOAD=true

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Bake the dotenvx-ENCRYPTED staging env (ciphertext). load-env.ts decrypts it at
# boot using DOTENV_PRIVATE_KEY_STAGING supplied at runtime (NODE_ENV=staging).
# Safe: without the private key this file reveals nothing.
COPY --chown=nestjs:nodejs .env.staging ./.env.staging

# Build identity — surfaced on /health/live + the root info endpoint for deploy
# verification. CI passes these; default to 'dev' for local builds.
ARG GIT_SHA=dev
ARG BUILD_TIME=dev
ENV GIT_SHA=$GIT_SHA
ENV BUILD_TIME=$BUILD_TIME

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check (liveness probe — anonymous + throttle-exempt)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/v1/health/live || exit 1

# Start the application (nest build emits to dist/src/main.js)
CMD ["node", "dist/src/main.js"]
