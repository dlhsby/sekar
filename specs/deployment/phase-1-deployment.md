# Phase 1 MVP Deployment Guide

> **Per-phase historical record.** The current, deduplicated deploy/operate procedures live in [`deployment-guide.md`](deployment-guide.md) (run local → staging → prod), [`operations.md`](operations.md), and [`credentials-setup.md`](credentials-setup.md). This file is retained as the Phase 1 review record (original AWS Free-Tier-from-zero walkthrough); some generic boilerplate it contains is superseded by those guides.

Step-by-step guide for deploying SEKAR Phase 1 MVP to AWS using **Free Tier credits**.

## Overview

This guide deploys the backend API to AWS with minimal cost using the new credit-based Free Tier. It's designed for the pilot deployment with 30 workers.

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                AWS Cloud (ap-southeast-3 Jakarta)        │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────┐ │
│  │  EC2 t3.micro   │───▶│ RDS db.t3.micro │    │  S3  │ │
│  │  (Backend API)  │    │  (PostgreSQL)   │    │Media │ │
│  │  Docker+Nginx   │    │   Free Credits  │    │Bucket│ │
│  └────────┬────────┘    └─────────────────┘    └──────┘ │
│           │                                              │
│  ┌────────┴────────┐                                    │
│  │   Elastic IP    │◀── sekar.wahyutrip.com (HTTP)     │
│  │  (Free w/ EC2)  │                                    │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

**AWS Free Tier (Updated July 2025):**

As of July 15, 2025, AWS uses a **credit-based system** instead of the old 12-month free tier:

| Credit Type | Amount | How to Get |
|-------------|--------|------------|
| Sign-up credit | $100 | Automatic on new account |
| Onboarding bonus | Up to $100 | Complete 5 quick tasks (EC2, RDS, Lambda, Bedrock, Budgets) |
| **Total Available** | **Up to $200** | Valid for 6-12 months |

**Important:** Credits are valid for up to 12 months. If you exceed credits, AWS suspends your account (data retained) - you won't be charged unexpectedly.

**Estimated Credit Usage (MVP):**
| Service | Monthly Est. | 6-Month Est. |
|---------|-------------|--------------|
| EC2 t3.micro | ~$8-12 | ~$50-70 |
| RDS db.t3.micro | ~$15-20 | ~$90-120 |
| S3 (10GB) | ~$1-2 | ~$6-12 |
| ECR (500MB) | $0 | $0 |
| Data Transfer | ~$2-5 | ~$12-30 |
| **Total** | **~$26-39/month** | **~$160-230** |

With $200 credits, you can run MVP for approximately **5-6 months**.

**Note:** ECR Free Tier provides 500 MB storage/month for 12 months. Your backend Docker image (~300-400 MB) plus a few version tags fits comfortably within this limit.

---

## 1. Pre-Deployment Checklist

### Code Readiness
- [x] All tests passing (`npm test` in be/)
- [x] Test coverage >80% (`npm run test:cov`)
- [x] No ESLint errors (`npm run lint`)
- [x] Build successful (`npm run build`)

### Infrastructure Readiness
- [x] AWS account created (new account for maximum credits)
- [x] MFA enabled on root account
- [x] IAM user created for CI/CD
- [x] AWS Budgets configured (track credit usage)

### Credentials Ready
- [x] AWS Access Key ID and Secret Access Key
- [x] SSH key pair for EC2 access
- [ ] Android signing keystore
- [ ] Google Maps API key

---

## 2. AWS Account Setup

### 2.1 Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Enter email, password, and account name
4. Enter contact and payment information (required but won't be charged)
5. Complete phone verification
6. **Choose "Free" plan** (credit-based)
7. You'll receive **$100 sign-up credits** automatically

### 2.2 Complete Onboarding Tasks for Bonus Credits

After account creation, complete these tasks for up to **$100 additional credits**:

1. **Launch an EC2 instance** (+$20)
2. **Create an RDS database** (+$20)
3. **Create a Lambda function** (+$20)
4. **Try Amazon Bedrock** (+$20)
5. **Set up AWS Budgets** (+$20)

Navigate to: AWS Console → "Getting Started" or check the onboarding dashboard.

### 2.3 Enable MFA on Root Account

1. Go to IAM Console → Security credentials
2. Click "Activate MFA"
3. Choose "Virtual MFA device"
4. Scan QR code with authenticator app (Google Authenticator, Authy)
5. Enter two consecutive MFA codes
6. Store backup codes securely

### 2.4 Create IAM User for CI/CD

**Via AWS Console:**

1. Go to IAM Console → Users → Create user
2. User name: `sekar-cicd-user`
3. Select "Provide user access to the AWS Management Console" (optional)
4. Click "Next"
5. Choose "Attach policies directly"
6. Search and select:
   - `AmazonEC2ReadOnlyAccess`
   - `AmazonS3FullAccess`
   - `AmazonRDSReadOnlyAccess`
7. Click "Create user"
8. Go to user → Security credentials → Create access key
9. Choose "Application running outside AWS"
10. **Save the Access Key ID and Secret Access Key** securely

### 2.5 Configure AWS Budgets

1. Go to AWS Budgets (search in console)
2. Click "Create budget"
3. Select "Customize (advanced)"
4. Budget type: "Cost budget"
5. Budget name: `sekar-monthly-budget`
6. Period: Monthly
7. Budget amount: $50 (alert before credits run out)
8. Configure alerts:
   - Alert 1: 50% ($25) - Email notification
   - Alert 2: 80% ($40) - Email notification
   - Alert 3: 100% ($50) - Email notification
9. Click "Create budget"

---

## 3. Infrastructure Provisioning

**Region: `ap-southeast-3` (Asia Pacific - Jakarta)**

### 3.1 Create VPC

**Via AWS Console:**

1. **Set region** to `Asia Pacific (Jakarta) ap-southeast-3` (top-right dropdown)
2. Go to VPC Console → Your VPCs → Create VPC
3. Configure:
   - **VPC settings:** VPC only
   - **Name tag:** `sekar-vpc`
   - **IPv4 CIDR:** `10.0.0.0/16`
   - **Tenancy:** Default
4. Click "Create VPC"

**Create Internet Gateway:**
1. VPC Console → Internet Gateways → Create internet gateway
2. Name: `sekar-igw`
3. Click "Create internet gateway"
4. Select the gateway → Actions → Attach to VPC → Select `sekar-vpc`

**Create Public Subnet:**
1. VPC Console → Subnets → Create subnet
2. Configure:
   - **VPC:** `sekar-vpc`
   - **Subnet name:** `sekar-public-subnet-1a`
   - **Availability Zone:** `ap-southeast-3a`
   - **IPv4 CIDR block:** `10.0.1.0/24`
3. Click "Create subnet"

**Create Second Subnet (required for RDS subnet group):**
1. VPC Console → Subnets → Create subnet
2. Configure:
   - **VPC:** `sekar-vpc`
   - **Subnet name:** `sekar-public-subnet-1b`
   - **Availability Zone:** `ap-southeast-3b`
   - **IPv4 CIDR block:** `10.0.2.0/24`
3. Click "Create subnet"

**Configure Route Table:**
1. VPC Console → Route tables
2. Select the route table associated with `sekar-vpc`
3. Click "Edit routes" → Add route:
   - **Destination:** `0.0.0.0/0`
   - **Target:** Select `sekar-igw` (Internet Gateway)
4. Save changes
5. Go to "Subnet associations" tab → "Edit subnet associations"
6. Select both subnets (`sekar-public-subnet-1a`, `sekar-public-subnet-1b`)
7. Save associations

**Enable Auto-assign Public IP:**
1. VPC Console → Subnets
2. Select `sekar-public-subnet-1a`
3. Actions → Edit subnet settings
4. Enable "Auto-assign public IPv4 address"
5. Save

### 3.2 Create Security Groups

**EC2 Security Group (`sekar-ec2-sg`):**

1. VPC Console → Security Groups → Create security group
2. Configure:
   - **Name:** `sekar-ec2-sg`
   - **Description:** Security group for SEKAR backend EC2
   - **VPC:** `sekar-vpc`
3. **Inbound rules** (click "Add rule" for each):

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| SSH | TCP | 22 | My IP | SSH access from your IP |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP access |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | NestJS API direct access |

4. **Outbound rules:** Leave default (All traffic)
5. Click "Create security group"

**RDS Security Group (`sekar-rds-sg`):**

1. VPC Console → Security Groups → Create security group
2. Configure:
   - **Name:** `sekar-rds-sg`
   - **Description:** Security group for SEKAR RDS
   - **VPC:** `sekar-vpc`
3. **Inbound rules:**

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| PostgreSQL | TCP | 5432 | sekar-ec2-sg | From EC2 only |

4. Click "Create security group"

### 3.3 Create RDS PostgreSQL

1. Go to RDS Console → Create database
2. **Choose a database creation method:** Standard create
3. **Engine options:**
   - Engine type: PostgreSQL
   - Version: PostgreSQL 14.x (latest 14)
4. **Templates:** Free tier (if shown) or Dev/Test
5. **Settings:**
   - DB instance identifier: `sekar-db`
   - Master username: `sekar_admin`
   - Master password: (generate strong password, save it!)
6. **Instance configuration:**
   - DB instance class: `db.t3.micro`
7. **Storage:**
   - Storage type: gp2
   - Allocated storage: 20 GB
   - Storage autoscaling: Disabled (to control costs)
8. **Connectivity:**
   - VPC: `sekar-vpc`
   - DB subnet group: Create new
   - Public access: **No**
   - VPC security group: Choose existing → `sekar-rds-sg`
   - Availability Zone: `ap-southeast-3a`
9. **Database authentication:** Password authentication
10. **Additional configuration:**
    - Initial database name: `sekar_db`
    - Backup retention period: 7 days
    - Enable encryption: Yes (default key)
    - Enable Enhanced monitoring: No (to save costs)
    - Enable Performance Insights: No
11. Click "Create database"

**Note:** RDS creation takes 5-10 minutes. Note the **endpoint** when available (e.g., `sekar-db.xxxxx.ap-southeast-3.rds.amazonaws.com`).

### 3.4 Create S3 Bucket

1. Go to S3 Console → Create bucket
2. Configure:
   - **Bucket name:** `sekar-media-prod-<unique-id>` (must be globally unique, e.g., `sekar-media-prod-dlhsby`)
   - **Region:** `ap-southeast-3`
3. **Object Ownership:** ACLs disabled
4. **Block Public Access:** Keep all checked (block all)
5. **Bucket Versioning:** Disabled
6. **Default encryption:** SSE-S3
7. Click "Create bucket"

**Configure CORS:**
1. Select the bucket → Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click "Edit" and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://sekar.wahyutrip.com", "http://localhost:3000", "http://10.0.2.2:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Save changes

### 3.5 Create EC2 Instance

1. Go to EC2 Console → Launch instance
2. **Name:** `sekar-backend`
3. **Application and OS Images:**
   - Quick Start: Amazon Linux
   - AMI: Amazon Linux 2023 AMI (Free tier eligible)
4. **Instance type:** `t3.micro`
5. **Key pair:**
   - Click "Create new key pair"
   - Name: `sekar-key`
   - Type: RSA
   - Format: .pem
   - Download and save `sekar-key.pem` securely
6. **Network settings:** Click "Edit"
   - VPC: `sekar-vpc`
   - Subnet: `sekar-public-subnet-1a`
   - Auto-assign public IP: Enable
   - Security group: Select existing → `sekar-ec2-sg`
7. **Configure storage:**
   - Size: 30 GB
   - Type: gp3
8. Click "Launch instance"

### 3.6 Allocate Elastic IP

1. EC2 Console → Elastic IPs → Allocate Elastic IP address
2. Click "Allocate"
3. Select the new Elastic IP → Actions → Associate Elastic IP address
4. Instance: `sekar-backend`
5. Click "Associate"
6. **Note the Elastic IP address** (e.g., `13.x.x.x`)

---

## 4. DNS Configuration (sekar.wahyutrip.com)

### 4.1 Add DNS Record at Dewaweb

1. Login to Dewaweb hosting panel (cPanel or custom panel)
2. Go to **Zone Editor** or **DNS Management**
3. Add A record:
   - **Type:** A
   - **Name:** sekar
   - **Address/Value:** `<EC2-Elastic-IP>`
   - **TTL:** 3600 (or 14400)
4. Save the record

### 4.2 Verify DNS Propagation

```bash
# Wait 5-30 minutes, then verify
nslookup sekar.wahyutrip.com
dig sekar.wahyutrip.com

# Expected output should show your Elastic IP
# You can also use: https://dnschecker.org
```

---

## 5. EC2 Server Setup

### 5.1 Connect to EC2

```bash
# Set permissions on key file (required on Linux/Mac)
chmod 400 sekar-key.pem

# Connect via SSH
ssh -i sekar-key.pem ec2-user@<elastic-ip>

# Example:
ssh -i sekar-key.pem ec2-user@13.x.x.x
```

### 5.2–5.4 Install Docker, Docker Compose, and Nginx

See [`deployment-guide.md`](deployment-guide.md) §E.1 (host prerequisites) for Docker, Docker Compose, and Nginx installation on Amazon Linux 2023.

### 5.5 Configure Nginx (HTTP Only)

```bash
sudo nano /etc/nginx/conf.d/sekar.conf
```

Paste the following configuration:

```nginx
# SEKAR Backend API - HTTP Configuration
server {
    listen 80;
    server_name sekar.wahyutrip.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to NestJS backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size limit (50MB for videos)
    client_max_body_size 50M;

    # Access and error logs
    access_log /var/log/nginx/sekar_access.log;
    error_log /var/log/nginx/sekar_error.log;
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx
```

---

## 6. Deploy Backend Application

### 6.1 Create ECR Repository

First, create an Elastic Container Registry (ECR) repository to store Docker images.

**Via AWS Console:**
1. Go to ECR Console → Repositories → Create repository
2. Configure:
   - Repository name: `sekar-backend`
   - Tag immutability: Disabled
   - Scan on push: Enabled
   - Encryption: AES-256
3. Click "Create repository"
4. **Note the repository URI:** `<account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend`

**Or via AWS CLI (from local machine):**
```bash
aws ecr create-repository \
  --repository-name sekar-backend \
  --region ap-southeast-3 \
  --image-scanning-configuration scanOnPush=true
```

### 6.2 Build and Push Initial Image (From Local Machine)

```bash
# Navigate to backend directory
cd be/

# Get your AWS account ID
aws sts get-caller-identity --query Account --output text

# Login to ECR
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com

# Build the Docker image
docker build -t sekar-backend:latest .

# Tag for ECR
docker tag sekar-backend:latest \
  <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest

# Push to ECR
docker push <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest
```

### 6.3 Set Up Deployment Directory on EC2

```bash
# SSH to EC2
ssh -i sekar-key.pem ec2-user@<elastic-ip>

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo dnf install -y unzip
unzip awscliv2.zip
sudo ./aws/install
aws --version

# Configure AWS credentials (for ECR access)
aws configure
# Enter:
# - AWS Access Key ID: <your-cicd-user-access-key>
# - AWS Secret Access Key: <your-cicd-user-secret-key>
# - Default region: ap-southeast-3
# - Default output format: json

# Create project directory
mkdir -p ~/sekar
cd ~/sekar
```

### 6.4 Create Production Environment File

```bash
nano .env.production
```

Paste and configure:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (RDS) - Get endpoint from RDS console
DATABASE_HOST=sekar-db.xxxxx.ap-southeast-3.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=sekar_admin
DATABASE_PASSWORD=<your-rds-password>
DATABASE_NAME=sekar_db

# Database Configuration - CRITICAL FOR INITIAL SETUP
DATABASE_SYNCHRONIZE=true     # Set to TRUE for initial setup (creates tables)
DATABASE_MIGRATIONS_RUN=false # Keep FALSE in production (see note below)

# Database SSL
DATABASE_SSL=true

# JWT (generate secure secrets - see below)
JWT_SECRET=<generate-256-bit-random-string>
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=<generate-different-256-bit-random-string>
JWT_REFRESH_EXPIRATION=7d

# AWS S3
AWS_REGION=ap-southeast-3
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_S3_BUCKET=sekar-media-prod-dlhsby

# CORS (HTTP for now)
CORS_ORIGIN=http://sekar.wahyutrip.com,http://localhost:3000

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
RATE_LIMIT_LOGIN_MAX=5

# Shift Configuration
MINIMUM_SHIFT_DURATION_MINUTES=5
```

**Generate secure JWT secrets:**
```bash
# Run these commands to generate secure random strings
openssl rand -base64 32  # Copy output to JWT_SECRET
openssl rand -base64 32  # Copy output to JWT_REFRESH_SECRET
```

**⚠️ CRITICAL: Verify `app.module.ts` Configuration**

The backend code must respect the `DATABASE_SYNCHRONIZE` environment variable. Verify this in `be/src/app.module.ts` (around line 59):

```typescript
// CORRECT - reads from environment variable
synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',

// WRONG - hardcoded to development only
// synchronize: process.env.NODE_ENV === 'development',
```

**If the code shows the WRONG version**, tables will NOT be created even with `DATABASE_SYNCHRONIZE=true` in your `.env.production` file. This was fixed in commit `95f09eb` (January 25, 2026).

**📘 Understanding `DATABASE_MIGRATIONS_RUN=false`**

**Why always `false` in production?**

When `DATABASE_MIGRATIONS_RUN=true`, TypeORM automatically runs migrations on app startup. This is **dangerous in production** because:

❌ **Migration failures cause downtime** - If migration fails, app won't start
❌ **No error recovery** - App stuck in crash loop until migration is fixed
❌ **No control** - Migrations run on every restart (even accidental restarts)
❌ **Difficult rollback** - Can't easily revert if migration causes issues

**The correct production approach:**

✅ **Manual migrations** - Run before deploying new code
✅ **Zero-downtime** - Old code runs while migration executes
✅ **Error recovery** - Migration fails? App still running, fix and retry
✅ **Testing** - Can run/revert migrations before committing
✅ **Control** - You decide when schema changes happen

**Production workflow:**
```bash
# 1. Pull new image (contains migration file)
docker-compose pull

# 2. Run migration BEFORE restarting app
docker-compose run --rm backend npm run migration:run:prod

# 3. Verify migration succeeded
docker-compose run --rm backend npm run migration:show:prod

# 4. NOW restart app with new code
docker-compose up -d
```

**When to use `true`:** Development/CI only, NEVER production.

### 6.5 Create Docker Compose File

```bash
nano docker-compose.yml
```

Paste (replace `<account-id>` with your AWS account ID):

```yaml
# Note: 'version' field is obsolete in Docker Compose v2+, but harmless to include
services:
  backend:
    image: <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest
    container_name: sekar-backend
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '0.9'
          memory: 768M
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 6.6 Deploy from ECR

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com

# Pull the image
docker-compose pull

# Start the container
docker-compose up -d

# Check if container is running
docker-compose ps

# View logs (Ctrl+C to exit)
docker-compose logs -f backend
```

### 6.7 Initialize Database Schema

For the initial deployment on an empty database, we need to create tables and seed initial data. **Use the following recommended approach:**

**✅ Recommended: Use TypeORM Synchronize for Initial Setup**

TypeORM's `synchronize=true` automatically creates tables based on entity definitions. This is the safest approach for an empty database.

```bash
# 1. Stop the container (if running)
docker-compose down

# 2. Configure for initial setup
nano .env.production
```

Edit these two settings:
```bash
DATABASE_SYNCHRONIZE=true     # Enable auto table creation
DATABASE_MIGRATIONS_RUN=false # Disable migrations for now
```

Save and exit (Ctrl+X, Y, Enter)

```bash
# 3. Start the container
docker-compose up -d

# 4. Wait for app to start (~30 seconds)
sleep 30

# 5. Check logs to verify app started successfully
docker-compose logs backend | grep "successfully started"
# Should see: "Nest application successfully started"

# 6. Seed the database (creates tables + inserts initial data)
docker-compose exec backend npm run seed:prod
```

**Expected output:**
```
🌱 Seeding database...
🗑️  Clearing existing data...
👥 Seeding users...
  ✓ Created Admin: admin
  ✓ Created Supervisor: supervisor1
  ✓ Created Supervisor: supervisor2
  ✓ Created Worker: worker1
  ✓ Created Worker: worker2
  ✓ Created Worker: worker3
🏷️  Seeding area types...
  ✓ Created area type: Taman
  ✓ Created area type: Trotoar
  ✓ Created area type: Taman Mini
  ✓ Created area type: Jalanan
📍 Seeding areas...
  ✓ Created area: Taman Bungkul
  ✓ Created area: Jalan Raya Darmo
  ✓ Created area: Taman Harmoni
👷 Seeding worker assignments...
  ✓ Assigned worker1 to Taman Bungkul
  ✓ Assigned worker2 to Jalan Raya Darmo
  ✓ Assigned worker3 to Taman Harmoni
⏰ Seeding shifts...
  ✓ Created completed shift for worker1 at Taman Bungkul
  ✓ Created completed shift for worker2 at Jalan Raya Darmo
  ✓ Created completed shift for worker3 at Taman Harmoni
  ✓ Created active shift for worker1 at Taman Bungkul
📝 Seeding reports...
  ✓ Created TASK_COMPLETION report
  ✓ Created MAINTENANCE_REQUEST report
📍 Seeding location logs...
  ✓ Created 10 location logs for worker1 active shift
✅ Database seeded successfully!
```

```bash
# 7. Verify tables were created by listing them
docker-compose exec backend sh -c "
  PGPASSWORD=\$DATABASE_PASSWORD psql \
    -h \$DATABASE_HOST \
    -p \$DATABASE_PORT \
    -U \$DATABASE_USER \
    -d \$DATABASE_NAME \
    -c '\dt'
"
```

**Expected output:**
```
                    List of relations
 Schema |          Name           | Type  |   Owner
--------+-------------------------+-------+------------
 public | area_types              | table | sekar_admin
 public | areas                   | table | sekar_admin
 public | location_logs           | table | sekar_admin
 public | reports                 | table | sekar_admin
 public | shifts                  | table | sekar_admin
 public | typeorm_migrations      | table | sekar_admin
 public | users                   | table | sekar_admin
 public | worker_assignments      | table | sekar_admin
(8 rows)
```

```bash
# 8. (Optional) Verify seeded data
docker-compose exec backend sh -c "
  PGPASSWORD=\$DATABASE_PASSWORD psql \
    -h \$DATABASE_HOST \
    -p \$DATABASE_PORT \
    -U \$DATABASE_USER \
    -d \$DATABASE_NAME \
    -c 'SELECT username, role FROM users;'
"
```

**Expected output:**
```
  username   |    role
-------------+------------
 admin       | Admin
 supervisor1 | Supervisor
 supervisor2 | Supervisor
 worker1     | Worker
 worker2     | Worker
 worker3     | Worker
(6 rows)
```

```bash
# 9. Switch to production mode (disable synchronize)
docker-compose down
nano .env.production
```

Edit:
```bash
DATABASE_SYNCHRONIZE=false    # Disable for production safety
DATABASE_MIGRATIONS_RUN=false # We'll run migrations manually when needed
```

Save and restart:
```bash
docker-compose up -d
```

**Why this approach works:**

1. **TypeORM synchronize** creates tables when entities are first accessed
2. **Seed script** has been updated (Jan 2026) to trigger table creation by querying each entity before clearing
3. **Graceful error handling** ensures the script doesn't crash if tables don't exist
4. After initial setup, synchronize is **disabled** for production safety

**⚠️ Important Notes:**

- **Never use `DATABASE_SYNCHRONIZE=true` in production after initial setup** - it can cause data loss on schema changes
- The seed script (`npm run seed:prod`) clears ALL existing data before seeding - only use on empty databases
- After initial setup, use migrations for schema changes (`npm run migration:run:prod`)
- The `:prod` scripts use compiled JavaScript (`dist/`) which is production-safe

**🔧 Troubleshooting:**

**Issue 1: Seed script fails with "relation 'users' does not exist"**

**Cause:** `DATABASE_SYNCHRONIZE=true` is set in `.env.production` but app.module.ts is not reading it.

**Solution:**

1. Verify `be/src/app.module.ts` line 59 reads from environment variable (not hardcoded)
2. Rebuild and redeploy Docker image with the fix
3. Restart container and retry seeding

```bash
# Verify the fix is in your codebase
grep "DATABASE_SYNCHRONIZE" be/src/app.module.ts
# Should show: synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',

# If not, update app.module.ts, rebuild, and redeploy
cd be
docker build -t sekar-backend:latest .
docker push <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest

# On EC2: pull and restart
cd ~/sekar
docker-compose down
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com
docker-compose pull
docker-compose up -d
sleep 30
docker-compose exec backend npm run seed:prod
```

**Issue 2: Seed warnings "⚠️ No location_logs to clear" but then fails on INSERT**

**Cause:** Tables aren't being created even though synchronize=true.

**Solution:** Same as Issue 1 - verify app.module.ts is reading DATABASE_SYNCHRONIZE environment variable.

**Issue 3: Migration fails with "relation does not exist"**

**Cause:** Database is empty but migrations try to ALTER tables.

**Solution:** Use synchronize=true for initial setup (creates tables), then switch to migrations for future schema changes.

**Issue 3: Seed hangs or takes too long**

```bash
# Check if database is accessible
docker-compose exec backend sh -c "
  PGPASSWORD=\$DATABASE_PASSWORD psql \
    -h \$DATABASE_HOST \
    -p \$DATABASE_PORT \
    -U \$DATABASE_USER \
    -d \$DATABASE_NAME \
    -c 'SELECT version();'
"

# Check RDS security group allows EC2 access
# Verify DATABASE_SSL=true if using RDS
```

**Issue 4: "password authentication failed"**

```bash
# Verify credentials in .env.production
cat .env.production | grep DATABASE_

# Test connection manually
docker-compose exec backend sh -c "
  PGPASSWORD='<your-rds-password>' psql \
    -h sekar-db.xxxxx.ap-southeast-3.rds.amazonaws.com \
    -p 5432 \
    -U sekar_admin \
    -d sekar_db \
    -c 'SELECT 1;'
"
```

### 6.8 Post-Setup: Disable Synchronize (CRITICAL!)

**⚠️ IMPORTANT:** After successful initial setup, **immediately disable synchronize** to prevent accidental schema changes in production.

```bash
# On EC2
cd ~/sekar
docker-compose down

# Edit .env.production
nano .env.production
```

**Change:**
```bash
DATABASE_SYNCHRONIZE=false    # ← CRITICAL: Set to false after initial setup!
DATABASE_MIGRATIONS_RUN=false # Keep false (run migrations manually)
```

Save and restart:
```bash
docker-compose up -d

# Verify app started successfully
docker-compose logs backend | tail -20
curl http://localhost:3000/api/health
```

**Why this is critical:**

- With `synchronize=true`, TypeORM automatically alters your database schema on every deployment
- If you accidentally modify an entity (add/remove/change a column), TypeORM will **drop and recreate tables**, causing **data loss**
- Always use migrations for schema changes in production (never synchronize)

### 6.9 Future Deployments (Zero-Downtime)

For subsequent code deployments via GitHub Actions or manual updates:

```bash
# SSH to EC2
ssh -i sekar-key.pem ec2-user@<elastic-ip>
cd ~/sekar

# Login to ECR (if session expired)
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com

# Pull latest image
docker-compose pull

# Restart with zero-downtime (Docker Compose handles graceful shutdown)
docker-compose up -d

# Verify deployment
docker-compose logs --tail=50 backend
curl http://localhost:3000/api/health
```

**For deployments with schema changes:**

```bash
# Run migrations BEFORE restarting app
docker-compose run --rm backend npm run migration:run:prod

# Verify migrations applied
docker-compose run --rm backend npm run migration:show:prod

# Then restart app
docker-compose up -d
```

---

## 7. Verify Deployment

### 7.1 Health Checks

See [`deployment-guide.md`](deployment-guide.md) §E.7 (smoke test) for standard health-check and basic authentication verification steps.

### 7.2 Test with Seeded Users

```bash
# Login with seeded admin
curl -X POST http://sekar.wahyutrip.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Password123!"}'
# Expected: JWT token response with access_token and refresh_token

# Login with seeded supervisor
curl -X POST http://sekar.wahyutrip.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor1","password":"Password123!"}'

# Login with seeded worker
curl -X POST http://sekar.wahyutrip.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"worker1","password":"Password123!"}'
```

---

## 8. GitHub Secrets Configuration

Configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value | Description |
|------------|-------|-------------|
| `EC2_HOST` | `<elastic-ip>` | EC2 Elastic IP address |
| `EC2_USER` | `ec2-user` | EC2 SSH user |
| `EC2_SSH_KEY` | `<base64-encoded-key>` | Base64 of sekar-key.pem |
| `AWS_ACCESS_KEY_ID` | `<access-key>` | AWS CI/CD user access key (for ECR push) |
| `AWS_SECRET_ACCESS_KEY` | `<secret-key>` | AWS CI/CD user secret key (for ECR push) |
| `ANDROID_SIGNING_KEY` | `<base64-keystore>` | Android release keystore |
| `ANDROID_KEY_ALIAS` | `sekar-key` | Keystore alias |
| `ANDROID_KEYSTORE_PASSWORD` | `<password>` | Keystore password |
| `ANDROID_KEY_PASSWORD` | `<password>` | Key password |
| `GOOGLE_MAPS_API_KEY` | `<api-key>` | Google Maps API key |

**Additional IAM Permissions for CI/CD User:**

The `sekar-cicd-user` needs ECR permissions for GitHub Actions to push images:

1. Go to IAM Console → Users → sekar-cicd-user → Permissions
2. Click "Add permissions" → "Attach policies directly"
3. Search and select: `AmazonEC2ContainerRegistryFullAccess`
4. Click "Add permissions"

**Encode SSH key:**
```bash
# On your local machine
base64 -w 0 sekar-key.pem > sekar-key-base64.txt
cat sekar-key-base64.txt
# Copy the entire output to EC2_SSH_KEY secret
```

---

## 9. Mobile Build & Distribution

### 9.1 Update Mobile Configuration

Edit `fe/mobile/.env`:
```bash
API_BASE_URL=http://sekar.wahyutrip.com
API_VERSION=v1
```

### 9.2 Build Release APK

```bash
cd fe/mobile

# Install dependencies
npm install

# Build release APK
cd android
./gradlew assembleRelease

# APK location
ls -la app/build/outputs/apk/release/
```

### 9.3 Sign APK (if not using GitHub Actions)

```bash
# Create keystore (one-time)
keytool -genkey -v -keystore sekar-release.keystore \
  -alias sekar-key -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore sekar-release.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk sekar-key

# Verify signature
jarsigner -verify -verbose -certs \
  app/build/outputs/apk/release/app-release-unsigned.apk
```

### 9.4 Distribute APK

**Option 1: Direct Sharing (Simplest for Pilot)**
- Share APK via WhatsApp/Email to pilot workers
- Workers enable "Install from unknown sources" in Android settings
- Install and test

**Option 2: Firebase App Distribution (Recommended for updates)**
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add Android app with package name
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Login: `firebase login`
5. Distribute: `firebase appdistribution:distribute app-release.apk --app <firebase-app-id>`

---

## 10. Rollback Plan

See [`operations.md`](operations.md) §Releases & Rollback for comprehensive rollback procedures covering backend Docker image rollback, database snapshots, and zero-downtime recovery strategies.

---

## 11. Monitoring & Maintenance

### 11.1 View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Nginx access logs
sudo tail -f /var/log/nginx/sekar_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/sekar_error.log
```

### 11.2 Monitor Credit Usage

1. Go to AWS Console → Billing Dashboard
2. Check "Credits" section for remaining credits
3. Review Cost Explorer for daily/monthly breakdown
4. Check AWS Budgets for alerts

### 11.3 CloudWatch Basic Monitoring

1. Go to CloudWatch Console (region: ap-southeast-3)
2. Create dashboard "sekar-monitoring"
3. Add widgets for:
   - EC2 CPU Utilization
   - EC2 Network In/Out
   - RDS CPU Utilization
   - RDS Free Storage Space
   - RDS Database Connections

### 11.4 Maintenance Tasks

**Weekly:**
- Check credit balance and burn rate
- Review error logs
- Check disk space: `df -h`

**Monthly:**
- Review AWS cost breakdown
- Update dependencies if needed
- Check for security patches

---

## 12. Verification Checklist

### Infrastructure
- [ ] VPC created with 2 public subnets (Jakarta region)
- [ ] Security groups configured (EC2 + RDS)
- [ ] RDS db.t3.micro running in ap-southeast-3
- [ ] S3 bucket created with CORS
- [ ] ECR repository created (sekar-backend)
- [ ] EC2 t3.micro running
- [ ] Elastic IP attached to EC2
- [ ] DNS record added at Dewaweb

### Server Setup
- [ ] Docker installed and working
- [ ] Docker Compose installed
- [ ] AWS CLI v2 installed on EC2
- [ ] AWS credentials configured on EC2 (for ECR access)
- [ ] Nginx installed and configured (HTTP)
- [ ] Nginx proxying to port 3000

### Application
- [ ] Docker image built and pushed to ECR
- [ ] Backend deployed and running from ECR
- [ ] Database migrations executed
- [ ] Seed data loaded
- [ ] Health endpoint responding: `curl http://sekar.wahyutrip.com/api/health`
- [ ] Swagger docs accessible: `http://sekar.wahyutrip.com/api/docs`
- [ ] Authentication working

### CI/CD
- [ ] GitHub Secrets configured (including AWS credentials)
- [ ] IAM user has ECR permissions
- [ ] Backend workflow passing (builds and pushes to ECR)
- [ ] Mobile workflow passing

### Mobile
- [ ] APK built successfully
- [ ] App connects to API (http://sekar.wahyutrip.com)
- [ ] Login working
- [ ] GPS tracking working
- [ ] Photo upload working

---

## 13. Adding HTTPS Later

When you're ready to add SSL/HTTPS:

### Option 1: Let's Encrypt (Free)

```bash
# SSH to EC2
ssh -i sekar-key.pem ec2-user@<elastic-ip>

# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d sekar.wahyutrip.com

# Auto-renewal is configured automatically
# Test renewal: sudo certbot renew --dry-run
```

### Option 2: Cloudflare (Free SSL + CDN)

1. Add domain to Cloudflare
2. Change nameservers at Dewaweb to Cloudflare
3. Enable "Flexible" SSL in Cloudflare
4. All traffic will be HTTPS → Cloudflare → HTTP → Your server

---

## 14. Cost Optimization Tips

1. **Stop RDS when not testing** (saves ~$0.50/day)
   ```bash
   aws rds stop-db-instance --db-instance-identifier sekar-db --region ap-southeast-3
   # Auto-starts after 7 days
   ```

2. **Use t3.micro instead of t2.micro** - Better performance, similar cost

3. **Monitor data transfer** - This can add up quickly

4. **Delete unused snapshots** - RDS snapshots cost money

5. **Set up billing alerts** - Don't let credits run out unexpectedly

---

## 15. Quick Reference: Complete Deployment Workflow

Use this as a checklist for deploying Phase 1 MVP from scratch:

### Initial Deployment

```bash
# === LOCAL MACHINE ===
# 1. Build and push Docker image
cd be
export AWS_PROFILE=sekar
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com
docker build -t sekar-backend:latest .
docker tag sekar-backend:latest <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest
docker push <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest

# === EC2 SERVER ===
# 2. Create .env.production with DATABASE_SYNCHRONIZE=true
nano ~/sekar/.env.production
# 3. Create docker-compose.yml
nano ~/sekar/docker-compose.yml
# 4. Login to ECR and pull image
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com
docker-compose pull
# 5. Start container
docker-compose up -d
sleep 30
# 6. Seed database (creates tables + data)
docker-compose exec backend npm run seed:prod
# 7. Verify database
docker-compose exec backend sh -c "PGPASSWORD=\$DATABASE_PASSWORD psql -h \$DATABASE_HOST -U \$DATABASE_USER -d \$DATABASE_NAME -c '\dt'"
# 8. DISABLE SYNCHRONIZE (CRITICAL!)
nano .env.production  # Set DATABASE_SYNCHRONIZE=false
docker-compose down && docker-compose up -d
# 9. Test API
curl http://sekar.wahyutrip.com/api/health
curl -X POST http://sekar.wahyutrip.com/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"Password123!"}'
```

### Future Deployments (Code Updates Only)

```bash
# === LOCAL MACHINE ===
docker build -t sekar-backend:latest .
docker push <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest

# === EC2 SERVER ===
cd ~/sekar
docker-compose pull
docker-compose up -d
docker-compose logs --tail=50 backend
```

### Future Deployments (With Schema Changes)

```bash
# === LOCAL MACHINE ===
# 1. Create migration
cd be
npm run migration:generate -- src/database/migrations/AddNewFeature
npm run migration:run  # Test locally
npm run migration:revert && npm run migration:run  # Verify rollback works
# 2. Build and push
docker build -t sekar-backend:latest .
docker push <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:latest

# === EC2 SERVER ===
cd ~/sekar
docker-compose pull
# Run migrations BEFORE restarting app
docker-compose run --rm backend npm run migration:run:prod
docker-compose run --rm backend npm run migration:show:prod
# Then restart
docker-compose up -d
```

### Common Commands

```bash
# View logs
docker-compose logs -f backend

# Restart app
docker-compose restart backend

# Stop all
docker-compose down

# Check container status
docker-compose ps

# Execute command in container
docker-compose exec backend sh

# Check database connection
docker-compose exec backend sh -c "PGPASSWORD=\$DATABASE_PASSWORD psql -h \$DATABASE_HOST -U \$DATABASE_USER -d \$DATABASE_NAME -c 'SELECT version();'"

# View environment variables
docker-compose exec backend env | grep DATABASE
```

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-25
**Status:** Active
**Region:** ap-southeast-3 (Jakarta)
**Protocol:** HTTP (HTTPS optional - see Section 13)

**Sources:**
- [AWS Free Tier Update (2025)](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits/)
- [AWS Free Tier Changes](https://dev.to/aws-builders/whats-new-in-aws-free-tier-2025-2ba5)
- [AWS Jakarta Region](https://aws.amazon.com/blogs/aws/now-open-aws-asia-pacific-jakarta-region/)

**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`ci-cd.md`](./ci-cd.md), [`environment-variables.md`](./environment-variables.md)
