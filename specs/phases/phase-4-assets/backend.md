# Phase 4 - Backend Implementation Checklist

**Duration:** 7 days
**Prerequisites:** Phase 3 deployed

---

## Overview

Implement asset management and maintenance tracking modules with QR code generation and assignment workflows.

---

## New Modules

### 1. Assets Module

**Path:** `be/src/modules/assets/`

```
assets/
├── assets.module.ts
├── assets.controller.ts
├── assets.controller.spec.ts
├── assets.service.ts
├── assets.service.spec.ts
├── dto/
│   ├── create-asset.dto.ts
│   ├── update-asset.dto.ts
│   ├── query-assets.dto.ts
│   ├── assign-asset.dto.ts
│   └── return-asset.dto.ts
├── entities/
│   ├── asset.entity.ts
│   ├── asset-type.entity.ts
│   └── asset-assignment.entity.ts
└── services/
    └── qr-code.service.ts
```

### 2. Maintenance Module

**Path:** `be/src/modules/maintenance/`

```
maintenance/
├── maintenance.module.ts
├── maintenance.controller.ts
├── maintenance.controller.spec.ts
├── maintenance.service.ts
├── maintenance.service.spec.ts
├── dto/
│   ├── create-maintenance.dto.ts
│   ├── update-maintenance.dto.ts
│   ├── query-maintenance.dto.ts
│   └── complete-maintenance.dto.ts
└── entities/
    ├── maintenance-record.entity.ts
    └── maintenance-schedule.entity.ts
```

---

## Database Entities

### Asset Entity

```typescript
// entities/asset.entity.ts
@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  assetCode: string;

  @Column({ length: 200 })
  name: string;

  @ManyToOne(() => AssetType)
  @JoinColumn({ name: 'asset_type_id' })
  assetType: AssetType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ type: 'date', nullable: true })
  warrantyExpiry: Date;

  @Column({
    type: 'enum',
    enum: ['available', 'in_use', 'maintenance', 'retired', 'lost'],
    default: 'available',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good',
  })
  condition: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'current_holder_id' })
  currentHolder: User;

  @ManyToOne(() => Area, { nullable: true })
  @JoinColumn({ name: 'current_area_id' })
  currentArea: Area;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  gpsLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  gpsLng: number;

  @Column({ type: 'text', nullable: true })
  photoUrl: string;

  @Column({ type: 'text', nullable: true })
  qrCodeUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => AssetAssignment, (assignment) => assignment.asset)
  assignments: AssetAssignment[];

  @OneToMany(() => MaintenanceRecord, (record) => record.asset)
  maintenanceRecords: MaintenanceRecord[];
}
```

### Asset Type Entity

```typescript
// entities/asset-type.entity.ts
@Entity('asset_types')
export class AssetType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ type: 'int', nullable: true })
  defaultMaintenanceIntervalDays: number;

  @Column({ default: true })
  isActive: boolean;
}
```

### Asset Assignment Entity

```typescript
// entities/asset-assignment.entity.ts
@Entity('asset_assignments')
export class AssetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: User;

  @ManyToOne(() => Area, { nullable: true })
  @JoinColumn({ name: 'assigned_to_area_id' })
  assignedToArea: Area;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: User;

  @Column({ type: 'timestamp with time zone' })
  assignedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  returnedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'returned_by_id' })
  returnedBy: User;

  @Column({ type: 'text', nullable: true })
  assignmentNotes: string;

  @Column({ type: 'text', nullable: true })
  returnNotes: string;

  @Column({ type: 'text', nullable: true })
  conditionOnAssign: string;

  @Column({ type: 'text', nullable: true })
  conditionOnReturn: string;
}
```

### Maintenance Record Entity

```typescript
// entities/maintenance-record.entity.ts
@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({
    type: 'enum',
    enum: ['preventive', 'corrective', 'inspection', 'emergency'],
  })
  maintenanceType: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'date', nullable: true })
  completedDate: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualCost: number;

  @Column({
    type: 'enum',
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'],
    default: 'scheduled',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  completionNotes: string;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[];

  @Column({ type: 'int', nullable: true })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## API Endpoints

### Assets Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /assets | Create new asset | Admin |
| GET | /assets | List assets with filters | All |
| GET | /assets/:id | Get asset details | All |
| PATCH | /assets/:id | Update asset | Admin, Supervisor |
| DELETE | /assets/:id | Soft delete asset | Admin |
| GET | /assets/by-code/:code | Get asset by QR code | All |
| POST | /assets/:id/assign | Assign asset | Admin, Supervisor |
| POST | /assets/:id/return | Return asset | Admin, Supervisor, Worker |
| GET | /assets/:id/history | Assignment history | Admin, Supervisor |
| GET | /assets/:id/maintenance | Maintenance history | All |
| POST | /assets/generate-qr-batch | Bulk QR generation | Admin |

### Asset Types Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /asset-types | Create asset type | Admin |
| GET | /asset-types | List asset types | All |
| GET | /asset-types/:id | Get asset type | All |
| PATCH | /asset-types/:id | Update asset type | Admin |
| DELETE | /asset-types/:id | Delete asset type | Admin |

### Maintenance Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /maintenance | Create maintenance record | Admin, Supervisor |
| GET | /maintenance | List maintenance records | All |
| GET | /maintenance/:id | Get maintenance details | All |
| PATCH | /maintenance/:id | Update maintenance | Admin, Supervisor |
| DELETE | /maintenance/:id | Delete maintenance | Admin |
| POST | /maintenance/:id/start | Start maintenance | Admin, Supervisor |
| POST | /maintenance/:id/complete | Complete maintenance | Admin, Supervisor |
| GET | /maintenance/upcoming | Upcoming maintenance | Admin, Supervisor |
| GET | /maintenance/overdue | Overdue maintenance | Admin, Supervisor |
| GET | /maintenance/calendar | Calendar view data | Admin, Supervisor |

---

## DTOs

### Create Asset DTO

```typescript
// dto/create-asset.dto.ts
export class CreateAssetDto {
  @IsString()
  @Length(3, 50)
  @IsOptional()
  assetCode?: string; // Auto-generate if not provided

  @IsString()
  @Length(2, 200)
  name: string;

  @IsNumber()
  assetTypeId: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string;

  @IsEnum(['excellent', 'good', 'fair', 'poor'])
  @IsOptional()
  condition?: string;

  @IsUUID()
  @IsOptional()
  currentAreaId?: string;

  @IsNumber()
  @IsOptional()
  gpsLat?: number;

  @IsNumber()
  @IsOptional()
  gpsLng?: number;

  @IsUrl()
  @IsOptional()
  photoUrl?: string;
}
```

### Assign Asset DTO

```typescript
// dto/assign-asset.dto.ts
export class AssignAssetDto {
  @IsUUID()
  @IsOptional()
  assignToUserId?: string;

  @IsUUID()
  @IsOptional()
  assignToAreaId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(['excellent', 'good', 'fair', 'poor'])
  conditionOnAssign: string;
}
```

### Create Maintenance DTO

```typescript
// dto/create-maintenance.dto.ts
export class CreateMaintenanceDto {
  @IsUUID()
  assetId: string;

  @IsEnum(['preventive', 'corrective', 'inspection', 'emergency'])
  maintenanceType: string;

  @IsString()
  @Length(5, 200)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  scheduledDate: string;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: number;
}
```

---

## QR Code Service

```typescript
// services/qr-code.service.ts
import * as QRCode from 'qrcode';
import { Injectable } from '@nestjs/common';
import { S3Service } from '@/shared/services/s3.service';

@Injectable()
export class QrCodeService {
  constructor(private s3Service: S3Service) {}

  async generateQrCode(assetCode: string): Promise<string> {
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(assetCode, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    // Upload to S3
    const key = `qr-codes/${assetCode}.png`;
    const url = await this.s3Service.uploadBuffer(qrBuffer, key, 'image/png');

    return url;
  }

  async generateQrCodeDataUrl(assetCode: string): Promise<string> {
    return QRCode.toDataURL(assetCode, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
  }

  async generateBulkQrCodes(assetCodes: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const code of assetCodes) {
      const url = await this.generateQrCode(code);
      results.set(code, url);
    }

    return results;
  }

  generateAssetCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ASSET-${timestamp}-${random}`;
  }
}
```

---

## Implementation Checklist

### Day 1-2: Assets Module Foundation

- [ ] Create assets module with NestJS CLI
- [ ] Asset entity with all fields
- [ ] AssetType entity
- [ ] AssetAssignment entity
- [ ] Create DTOs with validation
- [ ] Assets service - CRUD operations
- [ ] Assets controller with Swagger
- [ ] Database migration
- [ ] Unit tests for service (>80%)
- [ ] Unit tests for controller

### Day 3: QR Code & Assignment

- [ ] Install qrcode package
- [ ] QrCodeService implementation
- [ ] S3 integration for QR storage
- [ ] Auto-generate QR on asset creation
- [ ] Asset assignment endpoint
- [ ] Asset return endpoint
- [ ] Assignment history endpoint
- [ ] Bulk QR generation endpoint
- [ ] Unit tests for QR service

### Day 4-5: Maintenance Module

- [ ] Create maintenance module
- [ ] MaintenanceRecord entity
- [ ] Maintenance DTOs
- [ ] Maintenance service - CRUD
- [ ] Maintenance controller with Swagger
- [ ] Start/complete maintenance workflow
- [ ] Upcoming maintenance query
- [ ] Overdue maintenance detection
- [ ] Calendar data endpoint
- [ ] Unit tests (>80%)

### Day 6-7: Integration & Alerts

- [ ] Link maintenance to assets
- [ ] Preventive maintenance scheduler
- [ ] Maintenance reminder notifications
- [ ] Overdue maintenance alerts
- [ ] Asset condition updates
- [ ] Integration testing
- [ ] E2E tests
- [ ] API documentation update

---

## Dependencies

```bash
npm install qrcode
npm install @types/qrcode --save-dev
```

---

## Test Coverage Requirements

| Module | Target | Tests |
|--------|--------|-------|
| AssetsService | >80% | CRUD, assignment, return |
| AssetsController | >80% | All endpoints |
| QrCodeService | >80% | Generation, bulk |
| MaintenanceService | >80% | CRUD, workflow |
| MaintenanceController | >80% | All endpoints |

---

## Success Criteria

1. Assets can be created with auto-generated QR codes
2. QR codes are stored in S3 and accessible
3. Assets can be assigned to workers or areas
4. Assignment history is tracked
5. Maintenance records can be created and tracked
6. Upcoming and overdue maintenance queries work
7. All endpoints documented in Swagger
8. >80% test coverage achieved

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (>80% coverage)
- [ ] Integration tests for QR generation passing
- [ ] Test bulk QR generation (1000+ assets)
- [ ] Verify S3 bucket permissions for QR codes
- [ ] Test asset assignment workflows
- [ ] Test maintenance scheduling
- [ ] Database indexes created
- [ ] Asset seeder ready with sample data

### Environment Variables

```env
# QR Code Generation
QR_CODE_BUCKET=sekar-qr-codes
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION=H

# Asset Management
ASSET_CODE_PREFIX=SEKAR
ASSET_PHOTO_BUCKET=sekar-asset-photos
MAX_ASSET_PHOTO_SIZE=5242880  # 5MB

# Maintenance
MAINTENANCE_REMINDER_DAYS=7  # Days before scheduled maintenance
OVERDUE_CHECK_CRON=0 9 * * *  # 9 AM daily
```

### Deployment Steps

1. **Database Migration**
   ```bash
   npm run migration:run
   npm run seed:asset-types  # Seed predefined asset types
   ```

2. **Verify Endpoints**
   ```bash
   curl http://localhost:3000/api/asset-types
   curl http://localhost:3000/api/assets
   curl http://localhost:3000/api/maintenance
   ```

3. **Test QR Generation**
   ```bash
   # Create test asset with QR
   curl -X POST http://localhost:3000/api/assets \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Lawn Mower",
       "assetTypeId": 1,
       "condition": "good"
     }'
   ```

4. **Verify QR Upload to S3**
   ```bash
   aws s3 ls s3://sekar-qr-codes/ --recursive
   ```

### Post-Deployment

- [ ] Verify QR codes are scannable
- [ ] Test assignment workflow end-to-end
- [ ] Verify maintenance reminders trigger
- [ ] Check overdue maintenance detection
- [ ] Monitor S3 storage for QR codes
- [ ] Set up CloudWatch alarms for failures

### Rollback Plan

1. Revert database migration: `npm run migration:revert`
2. Delete generated QR codes: `aws s3 rm s3://sekar-qr-codes/ --recursive`
3. Redeploy previous version
4. Restore asset data from backup

---

## Bulk Operations Detail

### Bulk Asset Import

**CSV Format:**
```csv
asset_code,name,asset_type_id,brand,model,serial_number,purchase_date,purchase_price,condition,current_area_id
SEKAR-001,Lawn Mower A,1,Honda,HRX217,SN001,2025-06-15,5000000,good,area-uuid-1
SEKAR-002,Trimmer B,2,Stihl,FS 55,SN002,2025-07-20,2500000,excellent,area-uuid-2
```

**Endpoint:**
```typescript
POST /api/assets/bulk-import
Content-Type: multipart/form-data

Form Data:
- file: assets.csv
- generate_qr: true (optional)
```

**Response:**
```json
{
  "total": 50,
  "successful": 48,
  "failed": 2,
  "errors": [
    {
      "row": 15,
      "field": "asset_type_id",
      "message": "Asset type not found"
    },
    {
      "row": 23,
      "field": "asset_code",
      "message": "Asset code already exists"
    }
  ],
  "qr_codes_generated": 48
}
```

### Bulk QR Generation

**Request:**
```http
POST /api/assets/generate-qr-batch
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "asset_ids": [
    "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "9237ec92-08df-5d7f-b2c5-c2bdf395fb89"
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "asset_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
      "asset_code": "SEKAR-001",
      "qr_code_url": "https://sekar-qr-codes.s3.amazonaws.com/qr-codes/SEKAR-001.png"
    },
    {
      "asset_id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
      "asset_code": "SEKAR-002",
      "qr_code_url": "https://sekar-qr-codes.s3.amazonaws.com/qr-codes/SEKAR-002.png"
    }
  ]
}
```

---

## API Response Examples

### POST /assets (Create Asset)

**Response (201 Created):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "assetCode": "SEKAR-LM001",
  "name": "Lawn Mower Honda HRX217",
  "assetType": {
    "id": 1,
    "name": "Lawn Mower",
    "icon": "grass"
  },
  "description": "Commercial grade lawn mower",
  "brand": "Honda",
  "model": "HRX217",
  "serialNumber": "SN12345678",
  "purchaseDate": "2025-06-15",
  "purchasePrice": 5000000,
  "warrantyExpiry": "2027-06-15",
  "status": "available",
  "condition": "excellent",
  "qrCodeUrl": "https://sekar-qr-codes.s3.amazonaws.com/qr-codes/SEKAR-LM001.png",
  "createdAt": "2026-01-20T08:00:00.000Z",
  "updatedAt": "2026-01-20T08:00:00.000Z"
}
```

### POST /assets/:id/assign (Assign Asset)

**Request:**
```json
{
  "assignToUserId": "worker-uuid",
  "notes": "Assigned for park maintenance",
  "conditionOnAssign": "good"
}
```

**Response (201 Created):**
```json
{
  "id": "assignment-uuid",
  "asset": {
    "id": "asset-uuid",
    "assetCode": "SEKAR-LM001",
    "name": "Lawn Mower Honda HRX217"
  },
  "assignedToUser": {
    "id": "worker-uuid",
    "fullName": "Pekerja Satu"
  },
  "assignedBy": {
    "id": "supervisor-uuid",
    "fullName": "Supervisor Satu"
  },
  "assignedAt": "2026-01-20T08:00:00.000Z",
  "assignmentNotes": "Assigned for park maintenance",
  "conditionOnAssign": "good"
}
```

### GET /maintenance/upcoming

**Response (200 OK):**
```json
{
  "maintenance": [
    {
      "id": "maintenance-uuid",
      "asset": {
        "id": "asset-uuid",
        "assetCode": "SEKAR-LM001",
        "name": "Lawn Mower Honda HRX217"
      },
      "maintenanceType": "preventive",
      "title": "Monthly Oil Change",
      "description": "Replace engine oil and check air filter",
      "scheduledDate": "2026-01-25",
      "status": "scheduled",
      "priority": 2,
      "daysUntilDue": 5,
      "estimatedCost": 150000,
      "createdBy": {
        "id": "admin-uuid",
        "fullName": "Admin Satu"
      }
    }
  ],
  "total": 12,
  "summary": {
    "this_week": 5,
    "next_week": 7,
    "high_priority": 2
  }
}
```

---

**Last Updated:** 2026-01-21
