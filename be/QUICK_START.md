# 🚀 SEKAR Backend - Quick Start Guide

## ⚡ 5-Minute Setup

```bash
# 1. Install dependencies
cd be
npm install

# 2. Setup database (choose one)
# Option A: Using Docker (recommended)
cd ../db && ./start.sh

# Option B: Manual PostgreSQL
createdb sekar_db

# 3. Create .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
JWT_SECRET=dev-secret-key
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
EOF

# 4. Seed database
npm run seed

# 5. Start server
npm run start:dev

# 6. Visit Swagger UI
open http://localhost:3000/api/docs
```

## 🧪 Quick Test

### 1. Login via Swagger UI
1. Go to http://localhost:3000/api/docs
2. Expand **POST /api/auth/login**
3. Click **"Try it out"**
4. Enter:
   - username: `worker1`
   - password: `worker123`
5. Click **"Execute"**
6. Copy the `access_token` from response

### 2. Authorize
1. Click **"Authorize"** button (top right, with lock icon)
2. Paste your token
3. Click **"Authorize"**
4. Click **"Close"**

### 3. Test Protected Endpoints
- Try **GET /api/auth/me** - Should work ✅
- Try **GET /api/users** - Should work ✅

## 📝 Test Users

| Username | Password | Role | Can Do |
|----------|----------|------|--------|
| admin | admin123 | Admin | Everything |
| supervisor1 | supervisor123 | Supervisor | View all data |
| worker1 | worker123 | Worker | Own data only |

## 🔗 Useful Links

- **Swagger UI:** http://localhost:3000/api/docs
- **API Info:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health

## 📚 Full Documentation

- **Complete Guide:** [README.md](./README.md)
- **API Reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Environment:** [ENV_TEMPLATE.md](./ENV_TEMPLATE.md)

## 💻 Common Commands

```bash
# Development
npm run start:dev      # Start with watch mode
npm run start:debug    # Start with debugging

# Testing
npm test               # Run all tests
npm run test:cov       # With coverage
npm run test:e2e       # E2E tests

# Code Quality
npm run lint           # Lint code
npm run format         # Format code

# Database
npm run seed           # Seed test data
```

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run start:dev
```

### Database connection error?
```bash
# Check if PostgreSQL is running
# Docker: docker ps
# Manual: pg_isready

# Verify credentials in .env
cat .env | grep DATABASE
```

### Module not found?
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Next Steps

1. ✅ Backend running? Great!
2. 📖 Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
3. 🧪 Test endpoints in Swagger UI
4. 💻 Start building features!

---

**Need Help?** Check the [README.md](./README.md) or [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)


