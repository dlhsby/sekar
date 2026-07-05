#!/bin/bash

# SEKAR Production Deployment Test Script
# This script prepares and triggers the automated deployment

set -e  # Exit on error

echo "===================================================================="
echo "  SEKAR Production Deployment - Automated Secret Management"
echo "===================================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# Check current directory
if [ ! -f ".github/workflows/backend-ci-cd.yml" ]; then
    print_error "Must run from project root directory"
    exit 1
fi

print_success "Running from project root"
echo ""

# Pre-deployment checks
echo "=== Pre-Deployment Checks ==="
echo ""

# 1. Check git status
print_info "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected:"
    git status --short
    echo ""
else
    print_success "Working directory is clean"
fi

# 2. Check current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "Not on main branch! Deployment triggers on main branch push only."
    echo ""
    read -p "Switch to main branch? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main
        print_success "Switched to main branch"
    else
        print_error "Deployment cancelled"
        exit 1
    fi
fi
echo ""

# 3. Validate workflow YAML
echo "=== Validating GitHub Actions Workflows ==="
echo ""

print_info "Validating backend-ci-cd.yml..."
python3 -c "
import yaml
with open('.github/workflows/backend-ci-cd.yml', 'r') as f:
    yaml.safe_load(f)
" 2>/dev/null && print_success "backend-ci-cd.yml is valid" || { print_error "backend-ci-cd.yml has errors"; exit 1; }

print_info "Validating web-ci-cd.yml..."
python3 -c "
import yaml
with open('.github/workflows/web-ci-cd.yml', 'r') as f:
    yaml.safe_load(f)
" 2>/dev/null && print_success "web-ci-cd.yml is valid" || { print_error "web-ci-cd.yml has errors"; exit 1; }

echo ""

# 4. Check critical files exist
echo "=== Checking Critical Files ==="
echo ""

FILES=(
    ".github/workflows/backend-ci-cd.yml"
    ".github/workflows/web-ci-cd.yml"
    "apps/be/docker-compose.prod.yml"
    "apps/web/docker-compose.prod.yml"
    "apps/web/Dockerfile"
)

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        print_success "$FILE exists"
    else
        print_error "$FILE missing!"
        exit 1
    fi
done

echo ""

# 5. GitHub Secrets reminder
echo "=== GitHub Secrets Configuration ==="
echo ""
print_warning "IMPORTANT: Verify all 16 GitHub Secrets are configured!"
echo ""
echo "Required secrets (Settings → Secrets and variables → Actions):"
echo "  - AWS_ACCESS_KEY_ID"
echo "  - AWS_SECRET_ACCESS_KEY"
echo "  - AWS_S3_BUCKET"
echo "  - AWS_REGION"
echo "  - EC2_HOST"
echo "  - EC2_USER"
echo "  - EC2_SSH_KEY"
echo "  - DATABASE_HOST"
echo "  - DATABASE_PASSWORD"
echo "  - JWT_SECRET"
echo "  - JWT_REFRESH_SECRET"
echo "  - CORS_ORIGIN"
echo "  - FCM_PROJECT_ID"
echo "  - FCM_CLIENT_EMAIL"
echo "  - FCM_PRIVATE_KEY"
echo "  - GOOGLE_MAPS_API_KEY"
echo ""
print_info "See GITHUB_SECRETS_CONFIG.md for configuration guide"
echo ""

read -p "Have you configured all GitHub Secrets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please configure GitHub Secrets first"
    echo "Run: cat GITHUB_SECRETS_CONFIG.md"
    exit 1
fi

echo ""

# 6. Show files to be committed
echo "=== Files to be Committed ==="
echo ""
git add .
git status --short
echo ""

# 7. Deployment confirmation
echo "=== Ready to Deploy ==="
echo ""
print_info "This will trigger production deployment to:"
echo "  - API: https://api.sekar.wahyutrip.com"
echo "  - Web: https://sekar.wahyutrip.com"
echo ""
print_warning "Both backend and web will be deployed automatically!"
echo ""

read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

echo ""

# 8. Commit and push
echo "=== Committing Changes ==="
echo ""

COMMIT_MSG="feat(deployment): automate secret management for production

- Simplified CI/CD to production-only deployment
- Automated .env.production generation via envsubst
- Environment variables injected from GitHub Secrets
- Backend: secrets → .env.production on EC2
- Web: secrets → Docker build args
- Zero manual .env file management required

Deployment targets:
- API: https://api.sekar.wahyutrip.com
- Web: https://sekar.wahyutrip.com

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git commit -m "$COMMIT_MSG"
print_success "Changes committed"

echo ""
echo "=== Pushing to main ==="
echo ""

git push origin main
print_success "Pushed to main - deployment triggered!"

echo ""
echo "===================================================================="
echo "  🚀 Deployment Started!"
echo "===================================================================="
echo ""
print_info "Monitor deployment at:"
echo "  https://github.com/wahyutrip/sekar/actions"
echo ""
print_info "Expected timeline:"
echo "  - Lint & Test: ~3-5 minutes"
echo "  - Build: ~5-7 minutes"
echo "  - Deploy: ~2-3 minutes"
echo "  - Total: ~10-15 minutes"
echo ""
print_info "Verify deployment:"
echo "  Backend: curl https://api.sekar.wahyutrip.com/api/health"
echo "  Web: curl https://sekar.wahyutrip.com"
echo ""
print_success "Deployment script completed!"
echo ""
