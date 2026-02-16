# Web Dashboard Deployment Notes

## Critical Production Issues Resolved

### Issue #1: Cookie Security Flag Breaking HTTP Deployment (Feb 16, 2026)

**Problem:**
- Web dashboard deployed over HTTP (`http://sekar.wahyutrip.com`)
- Cookies automatically set with `secure` flag in production
- Browsers refuse to store `secure` cookies over HTTP connections
- Result: Infinite login loop (login succeeds → cookies not stored → page refresh → redirect to login)

**Root Cause:**
```typescript
// cookies.ts (original - BROKEN for HTTP)
secure = process.env.NODE_ENV === 'production',  // Always true in production
```

**Solution:**
```typescript
// cookies.ts (fixed - configurable)
secure = process.env.NEXT_PUBLIC_SECURE_COOKIES === 'true',  // Explicit opt-in
```

**Configuration:**
- **For HTTP deployments:** Do NOT set `NEXT_PUBLIC_SECURE_COOKIES` (defaults to false)
- **For HTTPS deployments:** Set `NEXT_PUBLIC_SECURE_COOKIES=true` in build args

**Testing:**
1. Clear browser cookies completely
2. Login at http://sekar.wahyutrip.com/login
3. Verify dashboard renders
4. Hard refresh (Ctrl+Shift+F5) - should NOT redirect to login
5. Check DevTools → Application → Cookies for `access_token`

**Files Modified:**
- `fe/web/src/lib/utils/cookies.ts` - Made secure flag configurable
- `.github/workflows/web-ci-cd.yml` - No change needed (defaults to false)

**PR:** #32

---

### Issue #2: Sidebar Title Not Visible

**Problem:**
- "SEKAR" text in sidebar not visible (white text on dark background without text color)

**Solution:**
```tsx
// sidebar.tsx
<h1 className="text-2xl font-extrabold text-nb-white">{title}</h1>
```

**Files Modified:**
- `fe/web/src/components/ui/sidebar.tsx` - Added `text-nb-white` class

---

## Deployment Architecture

### Current Setup (HTTP)
```
User Browser (HTTP)
    ↓
http://sekar.wahyutrip.com:3001
    ↓
Nginx/Caddy Reverse Proxy (optional)
    ↓
Docker Container (sekar-web)
    ↓
Next.js Standalone (port 3000)
```

**Cookie Configuration:**
- `secure: false` (allows HTTP)
- `sameSite: 'lax'`
- `path: '/'`
- `maxAge: 604800` (7 days for access_token)

### Future Setup (HTTPS - Recommended)
```
User Browser (HTTPS)
    ↓
https://sekar.wahyutrip.com
    ↓
Nginx with SSL/TLS (Let's Encrypt)
    ↓
Docker Container (sekar-web)
    ↓
Next.js Standalone
```

**Cookie Configuration (HTTPS):**
- Build with: `--build-arg NEXT_PUBLIC_SECURE_COOKIES=true`
- `secure: true` (enforces HTTPS)
- `sameSite: 'strict'` or `'lax'`
- `httpOnly: true` (if possible - requires backend support)

---

## CI/CD Pipeline

### Workflow: `.github/workflows/web-ci-cd.yml`

**Triggers:**
- Push to `main` branch
- Changes in `fe/web/**` or workflow file
- Manual dispatch

**Jobs:**
1. **Lint & Type Check** (~50s)
   - TypeScript compilation
   - ESLint
   - Prettier formatting check

2. **Unit Tests** (~45s)
   - Jest test suite
   - Requires all tests passing

3. **Build & Push to ECR** (~2m)
   - Multi-stage Docker build
   - Push to AWS ECR
   - Tags: `<commit-sha>` and `latest`

4. **Deploy to EC2** (~30s)
   - SSH into EC2
   - Pull new image from ECR
   - Stop old container
   - Start new container
   - Health check

**Total Duration:** ~3-4 minutes

**Build Arguments:**
```dockerfile
--build-arg NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}
--build-arg NEXT_PUBLIC_WS_URL=${{ secrets.NEXT_PUBLIC_WS_URL }}
--build-arg NEXT_PUBLIC_MAPBOX_TOKEN=${{ secrets.NEXT_PUBLIC_MAPBOX_TOKEN }}
# NEXT_PUBLIC_SECURE_COOKIES not set (defaults to false for HTTP)
```

---

## Environment Variables

### Required GitHub Secrets

**API Configuration:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., http://16.79.183.240:3000)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (e.g., ws://16.79.183.240:3000)

**Maps:**
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox API token

**AWS (for CI/CD):**
- `AWS_ACCESS_KEY_ID` - AWS IAM access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_REGION` - AWS region (ap-southeast-3)
- `ECR_REGISTRY` - ECR registry URL

**EC2 Deployment:**
- `EC2_HOST` - EC2 public IP
- `EC2_USER` - SSH user (ec2-user)
- `EC2_SSH_KEY` - SSH private key

### Optional (for HTTPS):**
- `NEXT_PUBLIC_SECURE_COOKIES=true` - Enable secure cookies for HTTPS

---

## Docker Configuration

### Dockerfile (Multi-stage Build)

**Stage 1: Dependencies**
```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
```

**Stage 2: Builder**
```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
RUN npm run build
```

**Stage 3: Runner**
```dockerfile
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Image Size:** ~150-200 MB (standalone build)

---

## Health Checks

### Endpoint: `/api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T12:22:05Z"
}
```

**Docker Health Check:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
```

**CI/CD Health Check:**
```bash
for i in {1..5}; do
  if curl -f http://localhost:3001/; then
    exit 0
  fi
  sleep 3
done
exit 1
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs sekar-web
```

**Common causes:**
- Missing environment variables
- Port 3001 already in use
- Insufficient memory

**Solution:**
```bash
# Check port usage
lsof -i:3001

# Check memory
free -h

# Restart with fresh pull
docker-compose down
docker-compose pull
docker-compose up -d
```

### Build Fails in CI/CD

**Prettier check fails:**
```bash
# Run locally
cd fe/web
npx prettier --write "src/**/*.{ts,tsx,js,jsx}"
git add .
git commit -m "style: format with prettier"
```

**TypeScript errors:**
```bash
# Check locally
npx tsc --noEmit
```

**ESLint errors:**
```bash
# Fix automatically
npm run lint -- --fix
```

### Cookies Not Persisting

**For HTTP:**
- Verify `NEXT_PUBLIC_SECURE_COOKIES` is NOT set in build args
- Check browser DevTools → Application → Cookies
- Clear browser cache and try again

**For HTTPS:**
- Set `NEXT_PUBLIC_SECURE_COOKIES=true` in build args
- Ensure site is accessed via https://
- Check SSL certificate is valid

---

## Performance Optimization

### Current Metrics
- **Build time:** ~90 seconds
- **Image size:** ~180 MB
- **Deployment time:** ~3-4 minutes
- **Page load (HTTP):** ~1-2 seconds

### Optimization Opportunities
1. **Enable compression** in nginx/caddy
2. **Add CDN** for static assets (CloudFront)
3. **Enable HTTP/2**
4. **Use HTTPS** for better performance
5. **Enable GZIP** compression
6. **Add Redis cache** for API responses

---

## Security Recommendations

### Current (HTTP - Development/Testing)
- ✅ Input validation
- ✅ CSRF protection
- ✅ XSS prevention
- ❌ HTTPS (not enabled)
- ❌ Secure cookies (disabled for HTTP)
- ❌ HSTS header
- ❌ Certificate pinning

### Production (HTTPS - Recommended)
1. **Setup HTTPS:**
   ```bash
   # Install Certbot
   sudo apt-get install certbot python3-certbot-nginx

   # Get certificate
   sudo certbot --nginx -d sekar.wahyutrip.com
   ```

2. **Enable secure cookies:**
   - Update GitHub Secret: `NEXT_PUBLIC_SECURE_COOKIES=true`
   - Redeploy

3. **Add security headers:**
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-XSS-Protection "1; mode=block" always;
   ```

4. **Regular updates:**
   - Keep Node.js updated
   - Update dependencies monthly
   - Apply security patches immediately

---

## Monitoring

### Recommended Tools
- **Uptime:** UptimeRobot, Pingdom
- **Logs:** CloudWatch, Datadog
- **Errors:** Sentry
- **Performance:** New Relic, Lighthouse CI
- **Analytics:** Google Analytics, Plausible

### Key Metrics to Monitor
- Uptime percentage (target: >99.9%)
- Response time (target: <500ms)
- Error rate (target: <0.1%)
- Build success rate (target: >95%)
- Deployment frequency
- Time to recovery

---

## Changelog

### 2026-02-16
- **Fixed:** Cookie secure flag breaking HTTP deployments
- **Fixed:** Sidebar SEKAR title not visible (added text-white)
- **Added:** Deployment checklist
- **Added:** This deployment notes document
- **Removed:** Debug page (temporary diagnostic tool)

### Future Improvements
- [ ] Setup HTTPS with Let's Encrypt
- [ ] Enable secure cookies for HTTPS
- [ ] Add CDN for static assets
- [ ] Implement Redis caching
- [ ] Setup monitoring (Sentry, New Relic)
- [ ] Add automated E2E tests in CI/CD
- [ ] Setup staging environment
- [ ] Implement blue-green deployment
