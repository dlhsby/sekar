# syntax=docker/dockerfile:1.7
# SEKAR Docs — public user manual (Docusaurus static site).
# Multi-stage: build static HTML with Node, then serve it from a tiny nginx.
# No runtime, no DB, no secrets — output is plain static files.

# Stage 1: Build the static site.
FROM node:24-slim AS builder
WORKDIR /app

# Site identity is baked at BUILD time (baseUrl/url are static-site constants).
# CI/compose pass these per environment; defaults target staging.
ARG DOCS_URL=https://docs.sekar.wahyutrip.com
ARG DOCS_BASE_URL=/
ARG APP_URL=https://sekar.wahyutrip.com
ENV DOCS_URL=$DOCS_URL
ENV DOCS_BASE_URL=$DOCS_BASE_URL
ENV APP_URL=$APP_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve the static output.
FROM nginx:1.27-alpine AS runner

# Custom server config (gzip, cache headers, SPA-style fallback for clean URLs).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
