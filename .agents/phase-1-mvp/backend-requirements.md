# Phase 1 - Backend Requirements (NestJS)

## 🎯 Overview
Build a RESTful API using NestJS with AWS services integration for the SEKAR MVP.

## 🏗️ Technical Stack
- **Framework:** NestJS (latest)
- **Language:** TypeScript
- **Database:** PostgreSQL (AWS RDS)
- **ORM:** TypeORM or Prisma
- **Authentication:** JWT with Passport
- **File Storage:** AWS S3
- **Testing:** Jest (>80% coverage per module)
- **Validation:** class-validator, class-transformer
- **Documentation:** Swagger/OpenAPI

## 📁 Project Structure

```
sekar-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── areas/
│   │   ├── area-types/
│   │   ├── shifts/
│   │   ├── reports/
│   │   ├── location/
│   │   └── supervisor/
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── utils/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   └── main.ts
├── test/
│   ├── unit/
│   └── integration/
├── .env.example
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## 📊 Database Schema

### Users Table
```typescript
interface User {
  id: number;
  username: string; // unique
  password_hash: string;
  full_name: string;
  role: 'worker' | 'supervisor';
  created_at: Date;
  updated_at: Date;
}
```

### Area Types Table
```typescript
interface AreaType {
  id: number;
  code: string; // 'park', 'pedestrian', 'mini_garden', 'street'
  name: string;
  description: string;
  created_at: Date;
}
```

### Areas Table
```typescript
interface Area {
  id: number;
  name: string;
  area_type_id: number;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  address: string;
  created_at: Date;
  updated_at: Date;
}
```

### Worker Assignments Table
```typescript
interface WorkerAssignment {
  id: number;
  worker_id: number;
  area_id: number;
  assigned_at: Date;
}
```

### Shifts Table
```typescript
interface Shift {
  id: number;
  worker_id: number;
  area_id: number;
  clock_in_time: Date;
  clock_in_gps_lat: number;
  clock_in_gps_lng: number;
  clock_in_photo_url: string;
  clock_out_time: Date | null;
  clock_out_gps_lat: number | null;
  clock_out_gps_lng: number | null;
  created_at: Date;
  updated_at: Date;
}
```

### Work Reports Table
```typescript
interface WorkReport {
  id: number;
  shift_id: number;
  worker_id: number;
  area_id: number;
  report_time: Date;
  gps_lat: number;
  gps_lng: number;
  notes: string;
  condition: 'Baik' | 'Cukup' | 'Buruk' | null;
  asset_id: number | null;
  reviewed: boolean;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

### Report Media Table
```typescript
interface ReportMedia {
  id: number;
  report_id: number;
  media_type: 'photo' | 'video';
  media_url: string;
  thumbnail_url: string;
  file_size_kb: number;
  created_at: Date;
}
```

### Location Pings Table
```typescript
interface LocationPing {
  id: number;
  worker_id: number;
  shift_id: number;
  timestamp: Date;
  gps_lat: number;
  gps_lng: number;
  accuracy_meters: number;
  created_at: Date;
}
```

### Assets Table (Optional for MVP)
```typescript
interface Asset {
  id: number;
  area_id: number;
  name: string;
  type: string; // 'bench', 'fountain', 'tree', etc.
  gps_lat: number;
  gps_lng: number;
  created_at: Date;
  updated_at: Date;
}
```

## 🔌 API Endpoints

### Authentication Module

#### POST /api/auth/login
**Description:** User login
```typescript
// Request
{
  username: string;
  password: string;
}

// Response
{
  token: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    role: string;
  }
}
```

#### GET /api/auth/me
**Description:** Get current user info
**Auth:** Required
```typescript
// Response
{
  id: number;
  username: string;
  full_name: string;
  role: string;
  assigned_area: {
    id: number;
    name: string;
    area_type: string;
  } | null;
}
```

### Areas Module

#### GET /api/areas
**Description:** Get all areas
**Auth:** Required
```typescript
// Response
{
  id: number;
  name: string;
  area_type: {
    id: number;
    code: string;
    name: string;
  };
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  address: string;
}[]
```

### Area Types Module

#### GET /api/area-types
**Description:** Get all area types
**Auth:** Required
```typescript
// Response
{
  id: number;
  code: string;
  name: string;
  description: string;
}[]
```

### Shifts Module

#### POST /api/shifts/clock-in
**Description:** Clock in to start shift
**Auth:** Required (Worker only)
```typescript
// Request
{
  area_id: number;
  gps_lat: number;
  gps_lng: number;
  selfie_photo: string; // base64 encoded
}

// Response
{
  shift_id: number;
  clock_in_time: string; // ISO date
}

// Validations:
// - User not already clocked in
// - GPS within area boundary (±100m)
// - Selfie photo required
```

#### POST /api/shifts/clock-out
**Description:** Clock out to end shift
**Auth:** Required (Worker only)
```typescript
// Request
{
  shift_id: number;
  gps_lat: number;
  gps_lng: number;
}

// Response
{
  shift_id: number;
  clock_out_time: string; // ISO date
  total_hours: number;
}

// Validations:
// - Shift must be active (no clock_out_time)
// - Must be the same user who clocked in
```

#### GET /api/shifts/current
**Description:** Get current active shift
**Auth:** Required (Worker only)
```typescript
// Response
{
  shift_id: number;
  area_name: string;
  area_type: string;
  clock_in_time: string;
  hours_worked: number;
} | null
```

### Reports Module

#### POST /api/reports/create
**Description:** Create a work report
**Auth:** Required (Worker only)
```typescript
// Request
{
  shift_id: number;
  notes: string; // max 500 chars
  condition?: 'Baik' | 'Cukup' | 'Buruk';
  asset_id?: number;
  gps_lat: number;
  gps_lng: number;
}

// Response
{
  report_id: number;
  report_time: string; // ISO date
}
```

#### POST /api/reports/:id/upload-media
**Description:** Upload photo/video for report
**Auth:** Required (Worker only)
**Content-Type:** multipart/form-data
```typescript
// Request
// Form data with file field

// Response
{
  media_id: number;
  media_url: string;
  thumbnail_url?: string;
}

// Validations:
// - File size max 50MB
// - Allowed types: image/*, video/*
// - Upload to S3 with unique filename
```

#### GET /api/reports/my-reports
**Description:** Get worker's own reports
**Auth:** Required (Worker only)
**Query:** date (YYYY-MM-DD)
```typescript
// Response
{
  report_id: number;
  report_time: string;
  notes: string;
  condition: string | null;
  media_urls: string[];
  gps_lat: number;
  gps_lng: number;
}[]
```

#### GET /api/reports/:id
**Description:** Get report details
**Auth:** Required
```typescript
// Response
{
  report_id: number;
  worker_name: string;
  area_name: string;
  area_type: string;
  report_time: string;
  notes: string;
  condition: string | null;
  gps_lat: number;
  gps_lng: number;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  media: {
    id: number;
    type: string;
    url: string;
    thumbnail_url: string;
  }[];
}
```

### Location Module

#### POST /api/location/batch
**Description:** Upload batch of location pings
**Auth:** Required (Worker only)
```typescript
// Request
{
  pings: {
    timestamp: string; // ISO date
    gps_lat: number;
    gps_lng: number;
    accuracy: number;
  }[];
}

// Response
{
  inserted_count: number;
}
```

### Supervisor Module

#### GET /api/supervisor/active-workers
**Description:** Get all currently active workers
**Auth:** Required (Supervisor only)
```typescript
// Response
{
  worker_id: number;
  full_name: string;
  area_name: string;
  area_type: string;
  current_gps_lat: number;
  current_gps_lng: number;
  clock_in_time: string;
  last_ping_time: string;
}[]

// Logic:
// - Get all active shifts (no clock_out_time)
// - Join with latest location_ping per worker
// - Join with areas and area_types
```

#### GET /api/supervisor/reports
**Description:** Get all work reports with filters
**Auth:** Required (Supervisor only)
**Query:** date, worker_id, area_id, area_type
```typescript
// Response
{
  report_id: number;
  worker_name: string;
  area_name: string;
  area_type: string;
  report_time: string;
  notes: string;
  condition: string | null;
  media_urls: string[];
  thumbnail_url: string | null;
  gps_lat: number;
  gps_lng: number;
  reviewed: boolean;
}[]
```

#### PUT /api/reports/:id/review
**Description:** Mark report as reviewed
**Auth:** Required (Supervisor only)
```typescript
// Request
{
  reviewed: boolean;
}

// Response
{
  success: boolean;
}

// Actions:
// - Set reviewed = true
// - Set reviewed_by = supervisor_id
// - Set reviewed_at = now
```

#### GET /api/supervisor/attendance
**Description:** Get attendance for a date
**Auth:** Required (Supervisor only)
**Query:** date, area_id, area_type
```typescript
// Response
{
  worker_id: number;
  full_name: string;
  area_name: string;
  area_type: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  hours_worked: number;
  reports_count: number;
}[]
```

## 🛡️ Security Requirements

### Authentication
- JWT tokens with 7-day expiration
- Bcrypt password hashing (10 rounds)
- Role-based guards (Worker, Supervisor)

### Authorization
- Workers can only access their own data
- Supervisors can access all data
- API endpoints protected with JWT guard

### Data Validation
- All inputs validated with class-validator
- GPS coordinates validated
- File uploads validated (type, size)

### AWS Security
- S3 bucket with restricted access
- IAM roles with minimal permissions
- Environment variables for secrets

## 🧪 Testing Requirements

### Unit Tests (Jest)
- Each service method tested
- Target: >80% coverage per module
- Mock external dependencies (S3, database)

### Test Coverage by Module
- Auth module: Login, JWT validation, guards
- Shifts module: Clock-in/out, GPS validation
- Reports module: Create report, upload media
- Location module: Batch insert
- Supervisor module: Dashboard queries

### Integration Tests
- API endpoint tests with test database
- Full workflows (clock-in → report → clock-out)
- Error handling and validation

## 🚀 Deployment Requirements

### Environment Variables
```bash
# App
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/sekar_db

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d

# AWS
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=sekar-media

# Google Maps (for future use)
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### AWS Resources
1. **RDS PostgreSQL**
   - Instance: db.t3.micro
   - Storage: 20GB SSD
   - Backup: Daily automated

2. **S3 Bucket**
   - Name: sekar-media
   - Region: ap-southeast-1
   - Public read access for media URLs

3. **Elastic Beanstalk / ECS**
   - Platform: Node.js 18
   - Instance: t3.small
   - Auto-scaling: 1-3 instances

### Database Migrations
- Use TypeORM/Prisma migrations
- Version controlled
- Automated deployment

### Seed Data
- 3 pilot areas (different types)
- 1 supervisor account
- 3 worker accounts with assignments
- 4 area types (park, pedestrian, mini_garden, street)

## 📝 Documentation

### API Documentation
- Swagger/OpenAPI auto-generated
- Available at `/api/docs`
- Include examples for all endpoints

### Code Documentation
- JSDoc comments for complex functions
- README with setup instructions
- Architecture decision records (ADRs)

## ✅ Acceptance Criteria

- [ ] All API endpoints implemented and working
- [ ] JWT authentication functional
- [ ] GPS boundary validation working
- [ ] S3 file upload working
- [ ] All modules have >80% test coverage
- [ ] Integration tests passing
- [ ] Deployed to AWS and accessible
- [ ] API documentation available
- [ ] Database migrations working
- [ ] Seed data script functional

