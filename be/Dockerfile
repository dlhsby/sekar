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

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
