# AWS S3 Setup Guide

**Purpose:** Configure AWS S3 for storing media files (selfie photos on clock-in, work report photos/videos).

**Related Documentation:**
- [Infrastructure Setup](./infrastructure-setup.md) - LocalStack alternative for development
- [Phase 2 Deployment](./phase-2-deployment.md) - Complete deployment guide
- [API Contracts](../api/contracts.md) - Endpoints that use S3

---

## Option 1: Production AWS S3 Setup

### Step 1: Create AWS Account

If you don't have one, sign up at https://aws.amazon.com/

### Step 2: Create S3 Bucket

1. Navigate to AWS Console → S3
2. Click **Create bucket**
3. Configure bucket settings:

**Bucket Configuration:**
- **Bucket name:** `sekar-media-production` (or `sekar-media-dev` for development)
- **Region:** `ap-southeast-1` (Singapore - closest to Indonesia for low latency)
- **Object Ownership:** ACLs disabled (recommended)
- **Block Public Access:** Keep all blocks enabled (use signed URLs instead)
- **Versioning:** Disabled (optional - enable for production data protection)
- **Encryption:** Enable (SSE-S3 or SSE-KMS)

4. Click **Create bucket**

### Step 3: Create IAM User with S3 Permissions

**Create User:**
1. Navigate to AWS Console → IAM → Users
2. Click **Create user**
3. **User name:** `sekar-s3-user`
4. Click **Next**

**Attach Permissions:**
5. Select **Attach policies directly**
6. Option A: Search and select `AmazonS3FullAccess` (quick setup)
7. Option B: Create custom policy (more secure - see below)
8. Click **Create user**

**Custom Policy (Recommended for Production):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sekar-media-production",
        "arn:aws:s3:::sekar-media-production/*"
      ]
    }
  ]
}
```

**What this policy allows:**
- `PutObject` - Upload new files (selfies, reports)
- `GetObject` - Download/retrieve files
- `DeleteObject` - Remove files (optional - can be omitted)
- `ListBucket` - List files in bucket (for admin/debugging)

### Step 4: Create Access Keys

1. Navigate to IAM → Users → `sekar-s3-user`
2. Click **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next** → **Create access key**
7. **CRITICAL:** Copy and save both credentials immediately:
   - **Access key ID** (e.g., `AKIA...`)
   - **Secret access key** (shown only once!)

**Security Note:** Never commit these keys to git. Store in `.env` file (which is gitignored).

### Step 5: Configure CORS (For Browser Direct Uploads)

If your web frontend uploads directly to S3:

1. Navigate to S3 → Your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)** section
3. Click **Edit**
4. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3001",
      "http://localhost:19006",
      "https://sekar.dlhsurabaya.go.id"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**For Production:** Replace `AllowedOrigins` with your actual domain(s) only.

### Step 6: Configure Backend Environment Variables

Add to `be/.env`:

```bash
# AWS S3 Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...your-access-key...
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=sekar-media-production

# Leave these empty for production (uses real AWS)
# AWS_ENDPOINT_URL=
# AWS_S3_FORCE_PATH_STYLE=
```

### Step 7: Verify Configuration

1. Start backend: `npm run start:dev`
2. Login as worker via Swagger UI
3. Test clock-in with selfie upload
4. Verify uploaded file appears in S3 bucket

**Check S3 Bucket:**
```bash
aws s3 ls s3://sekar-media-production --recursive
```

---

## Option 2: Development with LocalStack

For local development without AWS costs:

### Install and Run LocalStack

```bash
# Using Docker (recommended)
cd infra
docker-compose up -d localstack

# LocalStack runs on http://localhost:4566
```

### Create Local S3 Bucket

```bash
# From infra directory
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://localstack:4566'
```

### Configure Backend for LocalStack

Add to `be/.env`:

```bash
# LocalStack S3 (Development)
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=sekar-media-dev
AWS_REGION=ap-southeast-1
```

**Key Differences from Production:**
- `AWS_ENDPOINT_URL` - Points to LocalStack instead of AWS
- `AWS_S3_FORCE_PATH_STYLE=true` - Required for LocalStack
- Credentials are `test`/`test` (LocalStack accepts any values)

### Verify LocalStack S3

```bash
# List buckets
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls --endpoint-url http://localstack:4566'

# List objects in bucket
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls s3://sekar-media-dev --endpoint-url http://localstack:4566 --recursive'
```

---

## Option 3: Local File System (Quick Testing)

For quick local testing without S3:

### Modify S3 Service

Add flag to `be/src/config/configuration.ts`:

```typescript
s3: {
  enabled: process.env.S3_ENABLED !== 'false',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  // ... existing config
}
```

### Update Environment

```bash
# Disable S3, use local filesystem
S3_ENABLED=false
UPLOAD_DIR=./uploads
```

**Note:** This requires modifying `be/src/modules/s3/s3.service.ts` to check the `enabled` flag and save files locally when disabled. Not recommended for production.

---

## Troubleshooting

### Error: "The AWS Access Key Id you provided does not exist"

**Causes:**
- Access Key ID is incorrect in `.env`
- IAM user was deleted
- Typo in environment variable

**Solutions:**
```bash
# Verify .env file
cat be/.env | grep AWS_ACCESS_KEY_ID

# Regenerate access keys in AWS Console
# IAM → Users → sekar-s3-user → Security credentials → Create access key
```

### Error: "Access Denied"

**Causes:**
- IAM user lacks S3 permissions
- Bucket name doesn't match
- Bucket is in wrong region

**Solutions:**
```bash
# Verify IAM policy is attached
# AWS Console → IAM → Users → sekar-s3-user → Permissions

# Verify bucket exists
aws s3 ls

# Check bucket region matches AWS_REGION
aws s3api get-bucket-location --bucket sekar-media-production
```

### Error: "NoSuchBucket"

**Causes:**
- Bucket doesn't exist
- Bucket name typo (case-sensitive)
- Wrong AWS region

**Solutions:**
```bash
# Create bucket
aws s3 mb s3://sekar-media-production --region ap-southeast-1

# List all buckets
aws s3 ls

# Verify bucket name in .env
cat be/.env | grep AWS_S3_BUCKET
```

### Error: "SignatureDoesNotMatch"

**Causes:**
- Secret access key is incorrect
- Clock skew (system time incorrect)
- Endpoint URL mismatch

**Solutions:**
```bash
# Verify secret key (regenerate if needed)
# Check system time
date

# For LocalStack, verify endpoint URL
cat be/.env | grep AWS_ENDPOINT_URL
```

### LocalStack: Bucket Not Created Automatically

**Solution:**
```bash
# Check backend logs for S3 errors
docker-compose logs backend | grep S3

# Manually create bucket
cd infra
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://localstack:4566'
```

### Photo URLs Not Accessible

**Causes:**
- Public access blocked (expected - using signed URLs)
- URL format incorrect
- LocalStack not running

**Solutions:**
```bash
# For LocalStack, test from within container
docker-compose exec backend curl http://localhost:4566/sekar-media-dev/test.jpg

# Verify backend logs show correct URL format
# Should be: http://localhost:4566/sekar-media-dev/shifts/...

# Check if LocalStack is running
docker-compose ps localstack
```

---

## Security Best Practices

### 1. Never Commit Secrets
```bash
# .gitignore already includes
.env
.env.*
!.env.example
```

### 2. Use IAM Policies with Least Privilege
- Only grant necessary S3 actions
- Restrict to specific bucket ARN
- Avoid `AmazonS3FullAccess` in production

### 3. Enable S3 Bucket Encryption
```bash
aws s3api put-bucket-encryption \
  --bucket sekar-media-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 4. Block Public Access
- Keep all "Block Public Access" settings enabled
- Use signed URLs for private content
- Never make bucket or objects public

### 5. Rotate Access Keys Regularly
```bash
# Every 90 days, create new access keys and delete old ones
# IAM → Users → sekar-s3-user → Security credentials
```

### 6. Enable S3 Access Logging (Production)
```bash
aws s3api put-bucket-logging \
  --bucket sekar-media-production \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "sekar-logs",
      "TargetPrefix": "s3-access/"
    }
  }'
```

---

## Cost Optimization

### Storage Classes
- **Standard:** For frequently accessed files (selfies, recent reports)
- **Intelligent-Tiering:** Automatically moves objects between access tiers
- **Glacier:** For archival (old reports after 1 year)

### Lifecycle Policies Example
```json
{
  "Rules": [
    {
      "Id": "Archive old reports",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ],
      "Filter": {
        "Prefix": "reports/"
      }
    }
  ]
}
```

### Estimated Costs (ap-southeast-1)
- **Storage:** ~$0.025/GB/month (Standard)
- **Requests:** ~$0.005/1000 PUT, ~$0.0004/1000 GET
- **Data Transfer:** First 1GB free, then ~$0.12/GB out

**Example:** 500 workers × 30 photos/month × 2MB = 30GB storage + requests ≈ **$1-2/month**

---

## Environment Variables Summary

### Production AWS
```bash
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=sekar-media-production
# Leave empty:
# AWS_ENDPOINT_URL=
# AWS_S3_FORCE_PATH_STYLE=
```

### Development LocalStack
```bash
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=sekar-media-dev
AWS_REGION=ap-southeast-1
```

### Quick Local Testing (No S3)
```bash
S3_ENABLED=false
UPLOAD_DIR=./uploads
```

---

## Next Steps

After S3 is configured:

1. Test media uploads via API:
   - Clock-in with selfie: `POST /api/v1/shifts/clock-in`
   - Submit report with photo: `POST /api/v1/reports`

2. Verify uploaded files in S3 bucket:
   ```bash
   aws s3 ls s3://sekar-media-production --recursive
   ```

3. Test signed URL generation and access

4. Monitor S3 costs in AWS Console → Billing

5. Set up S3 access logging for production

6. Configure lifecycle policies for archival

---

**Last Updated:** February 2, 2026
**Related:** [Infrastructure Setup](./infrastructure-setup.md), [WSL2 Network](./wsl2-network-setup.md)
