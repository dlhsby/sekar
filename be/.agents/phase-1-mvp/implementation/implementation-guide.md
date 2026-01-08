# Implementation Guide - Phase 1 MVP

## Overview

Day-by-day implementation guide for SEKAR Backend MVP. Follow this guide sequentially for best results.

---

## Prerequisites

Before starting, ensure you have:
- [x] Node.js 18+ installed
- [x] PostgreSQL 14+ running
- [x] Git repository initialized
- [x] AWS account (for S3)
- [x] IDE with TypeScript support

---

## Day 1-2: Foundation (Auth & Users) ✅ COMPLETED

### Day 1: Project Setup

**Goal:** NestJS project with database connection

**Tasks:**
- [x] Initialize NestJS project
- [x] Configure TypeScript strict mode
- [x] Set up ESLint + Prettier
- [x] Configure TypeORM with PostgreSQL
- [x] Create database configuration
- [x] Test database connection

**Commands:**
```bash
# Project already initialized
npm install

# Configure .env file
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run start:dev
```

### Day 2: Auth & Users Modules

**Goal:** Complete authentication and user management

**Tasks:**
- [x] Create User entity
- [x] Implement UsersService with CRUD
- [x] Create AuthService with JWT
- [x] Implement JwtStrategy
- [x] Create JwtAuthGuard
- [x] Create RolesGuard
- [x] Add Swagger documentation
- [x] Write unit tests (>80% coverage)

**Verification:**
```bash
# Run tests
npm test

# Check coverage
npm run test:cov

# Test API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"worker1","password":"worker123"}'
```

---

## Day 3: Area Management 📋 TODO

### Goals
- AreaTypes module with seeded data
- Areas module with CRUD
- Worker assignments
- GPS boundary validation utility

### Morning: AreaTypes Module

**Tasks:**
- [ ] Create AreaType entity
- [ ] Create area-types.module.ts
- [ ] Create area-types.service.ts
- [ ] Create area-types.controller.ts
- [ ] Add Swagger decorators
- [ ] Write unit tests

**AreaType Entity:**
```typescript
// src/modules/area-types/entities/area-type.entity.ts
@Entity('area_types')
export class AreaType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Seed Data:**
```typescript
// src/database/seeds/area-types.seed.ts
const areaTypes = [
  { code: 'park', name: 'Park', description: 'Public park or garden' },
  { code: 'pedestrian', name: 'Pedestrian Zone', description: 'Pedestrian walkway with trees' },
  { code: 'mini_garden', name: 'Mini Garden', description: 'Small garden or green space' },
  { code: 'street', name: 'Street', description: 'Street with trees or greenery' },
];
```

### Afternoon: Areas Module

**Tasks:**
- [ ] Create Area entity
- [ ] Create areas.module.ts
- [ ] Create areas.service.ts with CRUD
- [ ] Create areas.controller.ts
- [ ] Add query filter by area_type
- [ ] Write unit tests (>80%)

**Area Entity:**
```typescript
// src/modules/areas/entities/area.entity.ts
@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'area_type_id' })
  areaTypeId: number;

  @Column({ name: 'gps_lat', type: 'decimal', precision: 10, scale: 8 })
  gpsLat: number;

  @Column({ name: 'gps_lng', type: 'decimal', precision: 11, scale: 8 })
  gpsLng: number;

  @Column({ name: 'radius_meters', default: 100 })
  radiusMeters: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => AreaType)
  @JoinColumn({ name: 'area_type_id' })
  areaType: AreaType;
}
```

### Late Afternoon: Worker Assignments & GPS Utility

**Tasks:**
- [ ] Create WorkerAssignment entity
- [ ] Create worker-assignments module
- [ ] Implement assign/unassign endpoints
- [ ] Create GPS utility for boundary validation

**GPS Utility:**
```typescript
// src/common/utils/gps.util.ts
export class GpsUtil {
  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @returns Distance in meters
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Check if GPS coordinates are within area boundary
   */
  static isWithinBoundary(
    lat: number,
    lng: number,
    areaLat: number,
    areaLng: number,
    radiusMeters: number,
  ): boolean {
    const distance = this.calculateDistance(lat, lng, areaLat, areaLng);
    return distance <= radiusMeters;
  }
}
```

**Tests:**
```typescript
describe('GpsUtil', () => {
  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const result = GpsUtil.calculateDistance(-7.2905, 112.7398, -7.2905, 112.7398);
      expect(result).toBe(0);
    });

    it('should calculate distance correctly', () => {
      // Taman Bungkul to Taman Harmoni (~1.5km)
      const result = GpsUtil.calculateDistance(-7.2905, 112.7398, -7.3037, 112.7375);
      expect(result).toBeGreaterThan(1400);
      expect(result).toBeLessThan(1600);
    });
  });

  describe('isWithinBoundary', () => {
    it('should return true when within radius', () => {
      const result = GpsUtil.isWithinBoundary(-7.2905, 112.7398, -7.2905, 112.7399, 100);
      expect(result).toBe(true);
    });

    it('should return false when outside radius', () => {
      const result = GpsUtil.isWithinBoundary(-7.2905, 112.7398, -7.3037, 112.7375, 100);
      expect(result).toBe(false);
    });
  });
});
```

### End of Day 3 Checklist
- [ ] AreaTypes module complete with tests
- [ ] Areas module complete with tests
- [ ] Worker assignments working
- [ ] GPS utility with tests
- [ ] All tests passing
- [ ] Swagger docs updated

---

## Day 4: Shifts Module 📋 TODO

### Goals
- Clock-in with GPS validation + selfie
- Clock-out tracking
- Current shift status
- S3 integration for photo upload

### Morning: S3 Service Setup

**Tasks:**
- [ ] Install AWS SDK v3
- [ ] Create S3 service
- [ ] Configure S3 bucket
- [ ] Test file upload

**Installation:**
```bash
npm install @aws-sdk/client-s3
```

**S3 Service:**
```typescript
// src/shared/services/s3.service.ts
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.get('AWS_S3_BUCKET');
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return `https://${this.bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
  }

  generateKey(folder: string, filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `sekar-media/${year}/${month}/${folder}/${filename}`;
  }
}
```

### Afternoon: Shifts Module

**Tasks:**
- [ ] Create Shift entity
- [ ] Create shifts.module.ts
- [ ] Create shifts.service.ts
- [ ] Implement clock-in logic
- [ ] Implement clock-out logic
- [ ] Implement current shift query
- [ ] Write unit tests (>80%)

**Clock-In DTO:**
```typescript
// src/modules/shifts/dto/clock-in.dto.ts
export class ClockInDto {
  @IsNumber()
  @ApiProperty({ example: 1 })
  area_id: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiProperty({ example: -7.2905 })
  gps_lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiProperty({ example: 112.7398 })
  gps_lng: number;

  @IsString()
  @ApiProperty({ description: 'Base64 encoded selfie photo' })
  selfie_photo: string;
}
```

**Shifts Service:**
```typescript
@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    private areasService: AreasService,
    private workerAssignmentsService: WorkerAssignmentsService,
    private s3Service: S3Service,
  ) {}

  async clockIn(userId: number, dto: ClockInDto): Promise<Shift> {
    // 1. Check no active shift
    const activeShift = await this.findActiveShift(userId);
    if (activeShift) {
      throw new BadRequestException('Already clocked in');
    }

    // 2. Verify worker is assigned to this area
    const assignment = await this.workerAssignmentsService.findByWorkerId(userId);
    if (!assignment || assignment.areaId !== dto.area_id) {
      throw new BadRequestException('Not assigned to this area');
    }

    // 3. Validate GPS is within boundary
    const area = await this.areasService.findOne(dto.area_id);
    const isWithin = GpsUtil.isWithinBoundary(
      dto.gps_lat,
      dto.gps_lng,
      area.gpsLat,
      area.gpsLng,
      area.radiusMeters,
    );
    if (!isWithin) {
      throw new BadRequestException('GPS location outside area boundary');
    }

    // 4. Upload selfie to S3
    const photoBuffer = Buffer.from(dto.selfie_photo.split(',')[1], 'base64');
    const filename = `${uuid()}.jpg`;
    const key = this.s3Service.generateKey('clock-in', filename);
    const photoUrl = await this.s3Service.uploadFile(photoBuffer, key, 'image/jpeg');

    // 5. Create shift
    const shift = this.shiftRepository.create({
      workerId: userId,
      areaId: dto.area_id,
      clockInTime: new Date(),
      clockInGpsLat: dto.gps_lat,
      clockInGpsLng: dto.gps_lng,
      clockInPhotoUrl: photoUrl,
    });

    return this.shiftRepository.save(shift);
  }

  async clockOut(userId: number, dto: ClockOutDto): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: dto.shift_id, workerId: userId, clockOutTime: IsNull() },
    });

    if (!shift) {
      throw new BadRequestException('No active shift found');
    }

    shift.clockOutTime = new Date();
    shift.clockOutGpsLat = dto.gps_lat;
    shift.clockOutGpsLng = dto.gps_lng;

    return this.shiftRepository.save(shift);
  }

  async findActiveShift(userId: number): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: { workerId: userId, clockOutTime: IsNull() },
      relations: ['area', 'area.areaType'],
    });
  }

  calculateHoursWorked(clockIn: Date, clockOut: Date | null): number {
    const end = clockOut || new Date();
    const diff = end.getTime() - clockIn.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  }
}
```

### End of Day 4 Checklist
- [ ] S3 service working
- [ ] Clock-in with GPS validation working
- [ ] Clock-out working
- [ ] Current shift query working
- [ ] Photo upload to S3 working
- [ ] All tests passing (>80%)

---

## Day 5: Reports, Location & Supervisor 📋 TODO

### Goals
- Work report submission
- Media upload
- Location batch upload
- Supervisor dashboard endpoints

### Morning: Reports Module

**Tasks:**
- [ ] Create WorkReport entity
- [ ] Create ReportMedia entity
- [ ] Create reports.module.ts
- [ ] Create reports.service.ts
- [ ] Implement create report
- [ ] Implement upload media
- [ ] Implement get my reports
- [ ] Write unit tests

### Midday: Location Module

**Tasks:**
- [ ] Create LocationPing entity
- [ ] Create location.module.ts
- [ ] Create location.service.ts
- [ ] Implement batch upload
- [ ] Optimize for bulk insert
- [ ] Write unit tests

**Batch Upload Service:**
```typescript
async uploadBatch(userId: number, dto: BatchLocationDto): Promise<number> {
  const activeShift = await this.shiftsService.findActiveShift(userId);
  if (!activeShift) {
    throw new BadRequestException('No active shift');
  }

  const pings = dto.pings.map((ping) => ({
    workerId: userId,
    shiftId: activeShift.id,
    timestamp: new Date(ping.timestamp),
    gpsLat: ping.gps_lat,
    gpsLng: ping.gps_lng,
    accuracyMeters: ping.accuracy,
  }));

  const result = await this.locationPingRepository.insert(pings);
  return result.identifiers.length;
}
```

### Afternoon: Supervisor Module

**Tasks:**
- [ ] Create supervisor.module.ts
- [ ] Create supervisor.service.ts
- [ ] Implement active workers endpoint
- [ ] Implement reports with filters
- [ ] Implement attendance endpoint
- [ ] Write unit tests

**Active Workers Query:**
```typescript
async getActiveWorkers(): Promise<ActiveWorkerDto[]> {
  const activeShifts = await this.shiftRepository
    .createQueryBuilder('shift')
    .leftJoinAndSelect('shift.worker', 'worker')
    .leftJoinAndSelect('shift.area', 'area')
    .leftJoinAndSelect('area.areaType', 'areaType')
    .where('shift.clockOutTime IS NULL')
    .getMany();

  return Promise.all(
    activeShifts.map(async (shift) => {
      const lastPing = await this.locationPingRepository.findOne({
        where: { shiftId: shift.id },
        order: { timestamp: 'DESC' },
      });

      return {
        worker_id: shift.workerId,
        full_name: shift.worker.fullName,
        area_name: shift.area.name,
        area_type: shift.area.areaType.code,
        current_gps_lat: lastPing?.gpsLat || shift.clockInGpsLat,
        current_gps_lng: lastPing?.gpsLng || shift.clockInGpsLng,
        clock_in_time: shift.clockInTime.toISOString(),
        last_ping_time: lastPing?.timestamp.toISOString() || null,
      };
    }),
  );
}
```

### Late Afternoon: Seeding & Deployment

**Tasks:**
- [ ] Complete seed script with all data
- [ ] Run full test suite
- [ ] Verify all endpoints in Swagger
- [ ] Build for production
- [ ] Deploy to AWS Elastic Beanstalk

### End of Day 5 Checklist
- [ ] Reports module complete
- [ ] Location module complete
- [ ] Supervisor module complete
- [ ] Full seed script working
- [ ] All tests passing (>80% coverage)
- [ ] Deployed to AWS

---

## Quick Reference

### Commands
```bash
# Development
npm run start:dev

# Tests
npm test
npm run test:cov

# Build
npm run build

# Database
npm run seed
npm run migration:run

# Linting
npm run lint
npm run format
```

### File Locations
```
Entity:     src/modules/{name}/entities/{name}.entity.ts
Service:    src/modules/{name}/{name}.service.ts
Controller: src/modules/{name}/{name}.controller.ts
DTO:        src/modules/{name}/dto/{action}.dto.ts
Test:       src/modules/{name}/{name}.service.spec.ts
```

---

*Last Updated: January 2026*

