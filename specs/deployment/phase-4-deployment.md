# Phase 4 Deployment Guide - Asset Management

Deployment procedures for Phase 4 features including QR code asset tracking, maintenance scheduling, equipment inventory, and asset lifecycle management.

## Overview

Phase 4 introduces:
- **QR Code Asset Tracking** with mobile scanning
- **Maintenance Scheduling** with automated reminders
- **Equipment Inventory Management** with stock levels
- **Asset Lifecycle Tracking** from procurement to disposal
- **Depreciation Calculations** for financial reporting
- **Asset Assignment History** tracking who used what and when

---

## 1. Pre-Deployment Checklist

### Code Readiness
- [ ] All Phase 4 features tested in development
- [ ] Unit tests passing (>80% coverage)
- [ ] E2E tests passing for asset workflows
- [ ] QR code generation and scanning tested
- [ ] Database migrations verified
- [ ] API documentation updated (Swagger)
- [ ] Mobile app QR scanner functional

### Infrastructure Readiness
- [ ] S3 bucket for QR code images configured
- [ ] CloudFront cache invalidation configured
- [ ] Database backup taken
- [ ] Maintenance scheduler cron jobs configured
- [ ] CloudWatch alarms configured for new endpoints

### Team Readiness
- [ ] Asset management training completed
- [ ] QR code printing supplier identified
- [ ] Asset tagging process documented
- [ ] Deployment window scheduled
- [ ] Rollback plan reviewed

---

## 2. S3 Bucket Configuration for QR Codes

### Create S3 Bucket

**Development:**
```bash
aws s3api create-bucket \
  --bucket sekar-qr-codes-dev \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-bucket-encryption \
  --bucket sekar-qr-codes-dev \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Production:**
```bash
aws s3api create-bucket \
  --bucket sekar-qr-codes-prod \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-bucket-encryption \
  --bucket sekar-qr-codes-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

aws s3api put-bucket-versioning \
  --bucket sekar-qr-codes-prod \
  --versioning-configuration Status=Enabled
```

### Bucket Structure

```
sekar-qr-codes-prod/
├── assets/
│   ├── ASSET-001_qr.png
│   ├── ASSET-002_qr.png
│   └── ...
├── equipment/
│   ├── EQUIP-001_qr.png
│   └── ...
└── printable/
    ├── batch-2026-01-21_qr_sheet.pdf
    └── ...
```

### Lifecycle Policy

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket sekar-qr-codes-prod \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldPrintablePDFs",
      "Status": "Enabled",
      "Prefix": "printable/",
      "Expiration": {
        "Days": 30
      }
    }]
  }'
```

### CORS Configuration

```bash
aws s3api put-bucket-cors \
  --bucket sekar-qr-codes-prod \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["https://sekar.DLH-sby.go.id", "https://api.sekar.DLH-sby.go.id"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }]
  }'
```

---

## 3. Environment Variables - Phase 4 Additions

### Backend (.env additions)

```bash
# QR Code Generation
QR_CODE_ENABLED=true
QR_CODE_S3_BUCKET=sekar-qr-codes-prod
QR_CODE_SIZE=300  # pixels (300x300)
QR_CODE_ERROR_CORRECTION=M  # L, M, Q, H
QR_CODE_BASE_URL=https://sekar.DLH-sby.go.id/asset
QR_CODE_FORMAT=png

# Asset Management
ASSET_CODE_PREFIX=ASSET-  # Format: ASSET-001, ASSET-002, etc.
ASSET_AUTO_NUMBER_START=1
ASSET_DEPRECIATION_METHOD=straight_line  # straight_line, declining_balance
ASSET_DEFAULT_USEFUL_LIFE=60  # months (5 years)

# Maintenance Scheduling
MAINTENANCE_REMINDER_ADVANCE_DAYS=7  # Send reminder 7 days before maintenance due
MAINTENANCE_AUTO_CREATE_TASKS=true
MAINTENANCE_OVERDUE_ESCALATION_DAYS=3

# Equipment Inventory
EQUIPMENT_LOW_STOCK_THRESHOLD=10  # Alert when stock < 10 units
EQUIPMENT_REORDER_POINT=20  # Suggest reorder when stock < 20 units

# Barcode Scanner Settings (Mobile)
BARCODE_SCAN_TIMEOUT=30000  # milliseconds
BARCODE_FORMATS=QR_CODE,CODE_128,EAN_13  # Supported formats
```

### Mobile App (.env additions)

```bash
# QR Code Scanner
QR_SCANNER_ENABLED=true
QR_SCANNER_TORCH_ENABLED=true  # Enable flashlight
QR_SCANNER_BEEP_ENABLED=true
QR_SCANNER_VIBRATE_ENABLED=true

# Asset Management
ASSET_PHOTO_REQUIRED=true  # Require photo when adding asset
ASSET_CONDITION_PHOTOS_MAX=3  # Max 3 photos per condition report
```

---

## 4. Database Migrations

### Migration Files for Phase 4

**Migration 1: Assets Table**
```sql
-- File: be/src/database/migrations/1707000000000-CreateAssetsTable.ts
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'vehicle', 'tool', 'equipment', 'furniture'
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'retired'
    condition VARCHAR(50) NOT NULL DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'

    -- Purchase info
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),

    -- Depreciation
    useful_life_months INTEGER,
    depreciation_method VARCHAR(50),
    current_value DECIMAL(12,2),
    accumulated_depreciation DECIMAL(12,2) DEFAULT 0,

    -- Location and assignment
    location VARCHAR(255),
    area_id UUID REFERENCES areas(id),
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,

    -- QR code
    qr_code_url TEXT,
    qr_code_data TEXT,  -- Encrypted data in QR

    -- Photos
    photo_urls JSONB,  -- Array of photo URLs

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_assets_asset_code ON assets(asset_code);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX idx_assets_area_id ON assets(area_id);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);
```

**Migration 2: Maintenance Schedules Table**
```sql
-- File: be/src/database/migrations/1707000001000-CreateMaintenanceSchedulesTable.ts
CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'preventive', 'corrective', 'inspection'
    frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    frequency_interval INTEGER DEFAULT 1, -- e.g., every 2 months

    -- Scheduling
    last_maintenance_date DATE,
    next_maintenance_date DATE NOT NULL,
    estimated_duration_minutes INTEGER,
    estimated_cost DECIMAL(12,2),

    -- Assignment
    assigned_to UUID REFERENCES users(id),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_maintenance_schedules_asset_id ON maintenance_schedules(asset_id);
CREATE INDEX idx_maintenance_schedules_next_date ON maintenance_schedules(next_maintenance_date);
CREATE INDEX idx_maintenance_schedules_type ON maintenance_schedules(type);
CREATE INDEX idx_maintenance_schedules_assigned_to ON maintenance_schedules(assigned_to);
```

**Migration 3: Maintenance Records Table**
```sql
-- File: be/src/database/migrations/1707000002000-CreateMaintenanceRecordsTable.ts
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    schedule_id UUID REFERENCES maintenance_schedules(id),
    type VARCHAR(50) NOT NULL,

    -- Execution details
    scheduled_date DATE,
    completed_date DATE,
    performed_by UUID NOT NULL REFERENCES users(id),
    duration_minutes INTEGER,

    -- Work details
    work_description TEXT NOT NULL,
    parts_replaced TEXT,
    cost DECIMAL(12,2),

    -- Before/after condition
    condition_before VARCHAR(50),
    condition_after VARCHAR(50),

    -- Photos
    photo_urls JSONB,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'completed', 'incomplete', 'cancelled'
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_maintenance_records_asset_id ON maintenance_records(asset_id);
CREATE INDEX idx_maintenance_records_schedule_id ON maintenance_records(schedule_id);
CREATE INDEX idx_maintenance_records_completed_date ON maintenance_records(completed_date DESC);
CREATE INDEX idx_maintenance_records_performed_by ON maintenance_records(performed_by);
```

**Migration 4: Equipment Inventory Table**
```sql
-- File: be/src/database/migrations/1707000003000-CreateEquipmentInventoryTable.ts
CREATE TABLE equipment_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'consumable', 'tool', 'ppe', 'spare_part'
    sku VARCHAR(100) UNIQUE,

    -- Stock management
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    max_stock INTEGER DEFAULT 100,
    reorder_point INTEGER DEFAULT 20,
    unit VARCHAR(50) NOT NULL, -- 'pcs', 'kg', 'liter', 'box'

    -- Procurement
    unit_price DECIMAL(12,2),
    supplier VARCHAR(255),
    lead_time_days INTEGER, -- days to receive after order

    -- Storage
    storage_location VARCHAR(255),

    -- Photos
    photo_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_equipment_inventory_category ON equipment_inventory(category);
CREATE INDEX idx_equipment_inventory_sku ON equipment_inventory(sku);
CREATE INDEX idx_equipment_inventory_current_stock ON equipment_inventory(current_stock);
```

**Migration 5: Equipment Transactions Table**
```sql
-- File: be/src/database/migrations/1707000004000-CreateEquipmentTransactionsTable.ts
CREATE TABLE equipment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id),
    type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'return', 'disposal', 'adjustment'
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2),
    total_price DECIMAL(12,2),

    -- Details
    reference_number VARCHAR(100), -- PO number, invoice number, etc.
    notes TEXT,

    -- User and time
    performed_by UUID NOT NULL REFERENCES users(id),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Related entities
    asset_id UUID REFERENCES assets(id), -- If used for asset maintenance
    worker_id UUID REFERENCES users(id), -- If issued to worker

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equipment_transactions_equipment_id ON equipment_transactions(equipment_id);
CREATE INDEX idx_equipment_transactions_type ON equipment_transactions(type);
CREATE INDEX idx_equipment_transactions_transaction_date ON equipment_transactions(transaction_date DESC);
CREATE INDEX idx_equipment_transactions_performed_by ON equipment_transactions(performed_by);
```

**Migration 6: Asset Assignments History Table**
```sql
-- File: be/src/database/migrations/1707000005000-CreateAssetAssignmentsTable.ts
CREATE TABLE asset_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    assigned_to UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),

    -- Assignment period
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMP WITH TIME ZONE,
    expected_return_date DATE,

    -- Condition tracking
    condition_at_assignment VARCHAR(50),
    condition_at_return VARCHAR(50),
    assignment_photo_url TEXT,
    return_photo_url TEXT,

    -- Notes
    assignment_notes TEXT,
    return_notes TEXT,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'returned', 'overdue'

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_asset_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_assigned_to ON asset_assignments(assigned_to);
CREATE INDEX idx_asset_assignments_status ON asset_assignments(status);
CREATE INDEX idx_asset_assignments_assigned_at ON asset_assignments(assigned_at DESC);
```

### Run Migrations

```bash
# Development
cd be
npm run typeorm migration:run

# Production
eb ssh sekar-prod
cd /var/app/current
NODE_ENV=production npm run typeorm migration:run
exit
```

---

## 5. QR Code Generation Setup

### Install QR Code Library

```bash
cd be
npm install qrcode @types/qrcode
```

### QR Code Service Implementation

**Backend service for generating QR codes:**
```typescript
// be/src/modules/assets/services/qr-code.service.ts
import * as QRCode from 'qrcode';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

export class QRCodeService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION });
  }

  /**
   * Generate QR code for asset
   * QR data format: encrypted JSON with asset_id, timestamp, checksum
   */
  async generateQRCode(assetId: string, assetCode: string): Promise<string> {
    // Create QR code data (encrypted for security)
    const qrData = this.encryptQRData({
      asset_id: assetId,
      asset_code: assetCode,
      generated_at: new Date().toISOString(),
      checksum: crypto.createHash('sha256').update(assetId + assetCode).digest('hex').substring(0, 8),
    });

    // Generate QR code image (PNG buffer)
    const qrBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Upload to S3
    const s3Key = `assets/${assetCode}_qr.png`;
    await this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.QR_CODE_S3_BUCKET,
      Key: s3Key,
      Body: qrBuffer,
      ContentType: 'image/png',
      CacheControl: 'max-age=31536000',  // 1 year
    }));

    // Return CloudFront URL
    return `https://${process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN}/${s3Key}`;
  }

  /**
   * Encrypt QR code data for security
   */
  private encryptQRData(data: any): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.QR_CODE_ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt QR code data
   */
  decryptQRData(encryptedData: string): any {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.QR_CODE_ENCRYPTION_KEY, 'hex');

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Generate printable QR code sheet (PDF) for batch printing
   */
  async generateQRCodeSheet(assetIds: string[]): Promise<string> {
    // Use PDFKit or similar library to create PDF with multiple QR codes
    // Return S3 URL of the PDF
  }
}
```

### Generate Encryption Key

```bash
# Generate 256-bit key for QR code encryption
openssl rand -hex 32

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name sekar/qrcode/encryption-key \
  --description "Encryption key for QR code data" \
  --secret-string '{"key":"GENERATED_HEX_KEY_HERE"}' \
  --region ap-southeast-1
```

---

## 6. Mobile App QR Scanner Setup

### Install QR Scanner Library

```bash
cd fe/mobile
npm install react-native-qrcode-scanner react-native-camera
```

### Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

### QR Scanner Component

```typescript
// fe/mobile/src/screens/assets/QRScannerScreen.tsx
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';

function QRScannerScreen() {
  const handleScan = async (event: any) => {
    const qrData = event.data;

    try {
      // Send to backend to decrypt and fetch asset details
      const response = await assetApi.scanQRCode(qrData);

      // Navigate to asset detail screen
      navigation.navigate('AssetDetail', { assetId: response.asset_id });
    } catch (error) {
      Alert.alert('Invalid QR Code', 'This QR code is not recognized.');
    }
  };

  return (
    <QRCodeScanner
      onRead={handleScan}
      flashMode={RNCamera.Constants.FlashMode.auto}
      topContent={
        <Text>Scan asset QR code</Text>
      }
      bottomContent={
        <Button title="Cancel" onPress={() => navigation.goBack()} />
      }
    />
  );
}
```

---

## 7. Maintenance Scheduler Setup

### Cron Job Configuration

**Create EventBridge rule for daily maintenance check:**
```bash
aws events put-rule \
  --name sekar-daily-maintenance-check \
  --schedule-expression "cron(0 6 * * ? *)" \
  --description "Check for upcoming maintenance daily at 6 AM UTC (2 PM WIB)"

aws events put-targets \
  --rule sekar-daily-maintenance-check \
  --targets "Id"="1","Arn"="arn:aws:lambda:ap-southeast-1:ACCOUNT_ID:function:sekar-maintenance-scheduler"
```

**Lambda function:**
```typescript
// lambda/maintenance-scheduler.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as pg from 'pg';

export const handler: APIGatewayProxyHandler = async (event) => {
  const pool = new pg.Pool({
    host: process.env.DATABASE_HOST,
    port: 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    // Find maintenance due in next 7 days
    const result = await pool.query(`
      SELECT ms.*, a.name as asset_name, a.assigned_to
      FROM maintenance_schedules ms
      JOIN assets a ON ms.asset_id = a.id
      WHERE ms.is_active = true
        AND ms.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND ms.deleted_at IS NULL
    `);

    // Create tasks and send notifications
    for (const schedule of result.rows) {
      // Create task
      await createMaintenanceTask(schedule);

      // Send notification to assigned worker
      if (schedule.assigned_to) {
        await sendNotification(schedule.assigned_to, {
          title: 'Maintenance Due Soon',
          body: `${schedule.asset_name} needs ${schedule.type} maintenance on ${schedule.next_maintenance_date}`,
          type: 'maintenance_reminder',
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: result.rows.length }),
    };
  } finally {
    await pool.end();
  }
};
```

---

## 8. Deployment Procedure

### Step 1: Pre-Deployment

```bash
# 1. Database backup
aws rds create-db-snapshot \
  --db-instance-identifier sekar-prod-db \
  --db-snapshot-identifier sekar-prod-db-pre-phase4-$(date +%Y%m%d-%H%M%S)

# 2. Setup S3 buckets
aws s3 mb s3://sekar-qr-codes-prod

# 3. Generate QR encryption key
openssl rand -hex 32
# Store in Secrets Manager (see section 5)

# 4. Deploy Lambda function for maintenance scheduler
cd lambda
zip -r maintenance-scheduler.zip maintenance-scheduler.js node_modules/
aws lambda create-function \
  --function-name sekar-maintenance-scheduler \
  --runtime nodejs18.x \
  --handler maintenance-scheduler.handler \
  --zip-file fileb://maintenance-scheduler.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/sekar-lambda-role
```

### Step 2: Deploy Backend

```bash
git checkout main
git merge staging
git tag -a v4.0.0 -m "Phase 4 Production Release - Asset Management"
git push origin main v4.0.0

# Run migrations
eb ssh sekar-prod
cd /var/app/current
NODE_ENV=production npm run typeorm migration:run
exit
```

### Step 3: Smoke Tests

```bash
API_URL="https://api.sekar.DLH-sby.go.id"

# Test asset creation
curl -X POST "$API_URL/api/assets/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "ASSET-001",
    "name": "Lawn Mower",
    "category": "equipment",
    "purchaseDate": "2026-01-15",
    "purchasePrice": 5000000
  }'

# Test QR code generation
curl "$API_URL/api/assets/ASSET-001/qr-code" \
  -H "Authorization: Bearer $TOKEN"

# Test maintenance schedule creation
curl -X POST "$API_URL/api/maintenance-schedules/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "uuid-here",
    "name": "Monthly Oil Change",
    "type": "preventive",
    "frequency": "monthly",
    "nextMaintenanceDate": "2026-02-15"
  }'
```

---

## 9. Asset Onboarding Process

### Initial Asset Registration

**Step 1: Bulk Import Existing Assets**
```bash
# Prepare CSV file with existing assets
# Format: asset_code,name,category,purchase_date,purchase_price,location

# Import via admin panel or API
curl -X POST "$API_URL/api/assets/import" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@assets-import.csv"
```

**Step 2: Generate QR Codes in Batch**
```bash
# Generate QR codes for all assets
curl -X POST "$API_URL/api/assets/generate-qr-codes-batch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetIds": ["uuid1", "uuid2", "uuid3", ...]
  }'

# Download printable PDF sheet
curl "$API_URL/api/assets/qr-codes-sheet?assetIds=uuid1,uuid2,uuid3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o qr-codes-batch.pdf
```

**Step 3: Print and Affix QR Codes**
- Print QR code sheets on waterproof sticker paper
- Laminate if needed for outdoor equipment
- Affix to assets in visible, accessible locations
- Take photos of installed QR codes for reference

**Step 4: Verify Scanning**
- Use mobile app to scan each QR code
- Verify correct asset information appears
- Update asset location if needed
- Mark asset as "QR code installed" in system

---

## 10. Monitoring - Phase 4 Additions

### Custom Metrics

```typescript
// Log asset management metrics
await logMetric('AssetCreated', 1, 'Count');
await logMetric('AssetScanned', 1, 'Count');
await logMetric('MaintenanceScheduled', 1, 'Count');
await logMetric('MaintenanceCompleted', 1, 'Count');
await logMetric('MaintenanceOverdue', 1, 'Count');
await logMetric('EquipmentStockLow', 1, 'Count');
await logMetric('QRCodeGenerated', 1, 'Count');
```

### CloudWatch Alarms

**Alarm 1: High Number of Overdue Maintenance**
```yaml
AlarmName: SEKAR-Prod-MaintenanceOverdue
MetricName: MaintenanceOverdue
Namespace: SEKAR/Assets
Statistic: Sum
Period: 86400  # 24 hours
EvaluationPeriods: 1
Threshold: 10
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-warning-alerts
```

**Alarm 2: Low Equipment Stock**
```yaml
AlarmName: SEKAR-Prod-EquipmentStockLow
MetricName: EquipmentStockLow
Namespace: SEKAR/Assets
Statistic: Sum
Period: 3600  # 1 hour
EvaluationPeriods: 2
Threshold: 5  # 5 items low in stock
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-warning-alerts
```

---

## 11. Rollback Procedure

```bash
# Disable asset features via environment variables
aws elasticbeanstalk update-environment \
  --environment-name sekar-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=QR_CODE_ENABLED,Value=false \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=MAINTENANCE_AUTO_CREATE_TASKS,Value=false

# Or full code rollback
git revert HEAD
git push origin main
```

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-21
**Status:** Active - Phase 4
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`phase-3-deployment.md`](./phase-3-deployment.md)
