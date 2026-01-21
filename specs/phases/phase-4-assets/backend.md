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

**Last Updated:** 2026-01-16
