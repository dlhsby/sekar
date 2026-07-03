# Web Dashboard Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] ESLint passing (`npm run lint`)
- [ ] Prettier formatting applied (`npx prettier --write "src/**/*.{ts,tsx}"`)
- [ ] No console.log statements in production code

### Build Verification
- [ ] Production build succeeds (`npm run build`)
- [ ] Standalone build created (`.next/standalone/`)
- [ ] Test production build locally (`npm start`)

### Environment Variables
- [ ] All required `NEXT_PUBLIC_*` variables set in GitHub Secrets
- [ ] API URL configured correctly (`NEXT_PUBLIC_API_URL`)
- [ ] WebSocket URL configured (`NEXT_PUBLIC_WS_URL`)
- [ ] Google Maps API key configured (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

### Security
- [ ] No sensitive data in client-side code
- [ ] Cookies configured correctly (secure flag for HTTPS)
- [ ] CORS settings verified with backend
- [ ] Rate limiting configured

## Deployment

### CI/CD Pipeline
- [ ] All jobs passing:
  - [ ] Lint & Type Check
  - [ ] Unit Tests
  - [ ] Build & Push to ECR
  - [ ] Deploy to EC2
  - [ ] Health Check

### Docker Image
- [ ] Image built successfully
- [ ] Image pushed to ECR
- [ ] Correct tag applied (commit SHA + latest)

### EC2 Deployment
- [ ] Container started successfully
- [ ] Health check endpoint responding (`/api/health`)
- [ ] No errors in container logs

## Post-Deployment Testing

### Authentication
- [ ] Login page loads correctly
- [ ] Login with valid credentials works
- [ ] Invalid credentials show error message
- [ ] Cookies persist after login
- [ ] Hard refresh (Ctrl+Shift+F5) does NOT log out user
- [ ] Logout works correctly

### Dashboard Rendering
- [ ] Dashboard loads after login
- [ ] All UI components visible:
  - [ ] Sidebar (SEKAR title visible in white)
  - [ ] Header with user menu
  - [ ] Stats cards
  - [ ] Quick action cards
- [ ] No hydration errors in console
- [ ] No JavaScript errors in console

### Navigation
- [ ] All sidebar links work
- [ ] Breadcrumbs show correctly
- [ ] Mobile menu works (responsive)
- [ ] Back button navigation works

### API Integration
- [ ] Network tab shows successful API calls
- [ ] GET /api/v1/auth/me succeeds after login
- [ ] Token refresh works automatically
- [ ] Error handling shows user-friendly messages

### Performance
- [ ] Page loads in <3 seconds
- [ ] No layout shift (CLS)
- [ ] Images load correctly
- [ ] Fonts load without FOUT

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if applicable)
- [ ] Mobile browsers (Chrome Mobile, Safari Mobile)

## Rollback Plan

If deployment fails:

```bash
# SSH into EC2
ssh -i <key.pem> ec2-user@<ec2-ip>

# Check current image
docker ps

# Rollback to previous image
docker stop sekar-web
docker rm sekar-web
docker run -d \
  --name sekar-web \
  --restart unless-stopped \
  -p 3001:3000 \
  <ECR_REGISTRY>/sekar-web:<PREVIOUS_SHA>

# Verify rollback
curl http://localhost:3001/
```

## Common Issues

### Issue: Components not rendering
**Symptom:** Background shows but no content
**Cause:** Missing 'use client' directives
**Fix:** Ensure all interactive components have `'use client';` as first line

### Issue: Login loop (redirects after refresh)
**Symptom:** Hard refresh redirects to login
**Cause:** Cookies not persisting
**Solution:**
- **For HTTP:** Ensure `NEXT_PUBLIC_SECURE_COOKIES` is NOT set (defaults to false)
- **For HTTPS:** Set `NEXT_PUBLIC_SECURE_COOKIES=true`

### Issue: Build fails in CI/CD
**Symptom:** Prettier check fails
**Fix:** Run `npx prettier --write "src/**/*.{ts,tsx}"` locally before pushing

### Issue: Hydration errors
**Symptom:** Console shows "Hydration failed"
**Fix:** Check for server/client mismatch in rendered HTML

## Monitoring

### Health Checks
- Monitor health endpoint: `curl http://<domain>/api/health`
- Expected response: `200 OK`

### Container Logs
```bash
docker logs sekar-web --tail 50 --follow
```

### GitHub Actions
- Monitor workflow runs: https://github.com/dlhsby/sekar/actions
- Check for failed deployments
- Review error logs if deployment fails

## Success Criteria

Deployment is successful when:
- ✅ All CI/CD jobs pass
- ✅ Health check returns 200 OK
- ✅ Login works without errors
- ✅ Dashboard renders completely
- ✅ Hard refresh does NOT log out user
- ✅ No console errors
- ✅ All navigation works
- ✅ API calls succeed

## Notes

- Always test production build locally before deploying
- Clear browser cache when testing deployment
- Monitor first 15 minutes after deployment for issues
- Keep previous Docker image available for quick rollback
