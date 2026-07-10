# Authentication & Authorization Specifications

Comprehensive authentication and authorization specifications for SEKAR Backend API.

**Last Updated:** 2026-06-20 · **Status:** Phase 5 Complete (reflects 8-role system, JWT rotation, Phase 2E+ scope fields)

> **Current System:** This document reflects the 8-role system (ADR-009: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin). JWT tokens include scope fields (rayon_id, area_id) since Phase 2E. Phase 2D adds scope-based monitoring authorization. See [ADR-009](../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md) for role mapping.

## Table of Contents

1. [Overview](#overview)
2. [JWT Token Authentication](#jwt-token-authentication)
3. [Role-Based Access Control](#role-based-access-control)
4. [Password Security](#password-security)
5. [Implementation Details](#implementation-details)
6. [Security Best Practices](#security-best-practices)

---

## Overview

SEKAR uses a stateless JWT (JSON Web Token) based authentication system combined with role-based access control (RBAC) for authorization.

### Key Features

- **Stateless Authentication:** No server-side session storage
- **Two-Token System:** Access tokens (15 min) + Refresh tokens (7 days) with rotation
- **Role-Based Access:** Eight roles (satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin) with distinct permissions (see ADR-009)
- **Password Security:** Bcrypt hashing with 10 rounds
- **Passport.js Integration:** Standard authentication middleware
- **Swagger Integration:** Bearer token authentication in API docs

---

## JWT Token Authentication

SEKAR uses a two-token authentication system for enhanced security:

1. **Access Token:** Short-lived (15 minutes), used for API requests
2. **Refresh Token:** Long-lived (7 days), used to obtain new access tokens

### Access Token Structure

Access tokens are JWTs consisting of three parts: Header, Payload, and Signature.

#### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```
- **Algorithm:** HMAC SHA-256
- **Type:** JWT

#### Payload (Access Token)
```json
{
  "sub": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "satgas1",
  "role": "satgas",
  "rayon_id": "uuid-or-null",
  "area_id": "uuid-or-null",
  "iat": 1736420400,
  "exp": 1736421300
}
```

**Payload Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (UUID) - Subject claim |
| `username` | string | Username for logging/debugging |
| `role` | string | User role (one of 8 roles: `satgas`, `linmas`, `korlap`, `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`) |
| `rayon_id` | string\|null | User's assigned rayon UUID (null for superadmin/admin_system) |
| `area_id` | string\|null | User's assigned area UUID (null for roles above area level) |
| `iat` | number | Issued At timestamp (Unix epoch) |
| `exp` | number | Expiration timestamp (Unix epoch, +15 minutes) |

#### Refresh Token Structure

Refresh tokens are opaque tokens (not JWTs) stored in the database with metadata:

```typescript
interface RefreshToken {
  id: string;  // UUID
  user_id: string;  // User UUID
  token: string;  // Hashed refresh token
  expires_at: Date;  // 7 days from issuance
  created_at: Date;
}

#### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```
- Signed with secret key from environment variable
- Ensures token integrity and authenticity

### Complete Token Example (Phase 2E+: 8-role system)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MTI3ZGM4MS05N2NmLTRjNmUtYTFiNC1iMWFjZTI4NGVhNzgiLCJ1c2VybmFtZSI6InNhdGdhczEiLCJyb2xlIjoic2F0Z2FzIiwicmF5b25faWQiOiJudWxsIiwiYXJlYV9pZCI6ImM0ZDVlNmY3LWE4YjktMDEyMy1kZWYwLTEyMzQ1Njc4OTAxMiIsImlhdCI6MTczNjQyMDQwMCwiZXhwIjoxNzM2NDIxMzAwfQ.abc123...
```

---

## Token Generation (Login)

### Implementation

**File:** `apps/be/src/modules/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // 1. Find user by username
    const user = await this.usersService.findByUsername(loginDto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if account is active
    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // 5. Return token and user info (without password)
    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }
}
```

### Login Flow Diagram

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ Client  │         │   API    │         │ Database │
└────┬────┘         └─────┬────┘         └─────┬────┘
     │                    │                    │
     │ POST /auth/login   │                    │
     │ {username, pwd}    │                    │
     ├───────────────────>│                    │
     │                    │ Find user          │
     │                    ├───────────────────>│
     │                    │                    │
     │                    │ User data          │
     │                    │<───────────────────┤
     │                    │                    │
     │                    │ Verify password    │
     │                    │ (bcrypt.compare)   │
     │                    │                    │
     │                    │ Generate JWT       │
     │                    │ (sign payload)     │
     │                    │                    │
     │ 200 OK             │                    │
     │ {token, user}      │                    │
     │<───────────────────┤                    │
     │                    │                    │
```

### Security Considerations

1. **Password Never Logged:** Password excluded from logs and responses
2. **Generic Error Messages:** "Invalid credentials" for both username and password errors (prevents username enumeration)
3. **Active Account Check:** Prevents deleted/inactive users from logging in
4. **Bcrypt Timing:** Constant-time comparison prevents timing attacks

---

## Token Validation

### Implementation

**File:** `apps/be/src/modules/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Payload already verified by Passport JWT strategy
    // Now we fetch user from database to ensure still exists and active

    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Attach user to request object (request.user)
    return user;
  }
}
```

### Validation Flow

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ Client  │         │   API    │         │ Database │
└────┬────┘         └─────┬────┘         └─────┬────┘
     │                    │                    │
     │ GET /protected     │                    │
     │ Authorization:     │                    │
     │ Bearer {token}     │                    │
     ├───────────────────>│                    │
     │                    │                    │
     │                    │ 1. Extract token   │
     │                    │    from header     │
     │                    │                    │
     │                    │ 2. Verify signature│
     │                    │    (JWT_SECRET)    │
     │                    │                    │
     │                    │ 3. Check expiration│
     │                    │                    │
     │                    │ 4. Decode payload  │
     │                    │                    │
     │                    │ 5. Fetch user      │
     │                    ├───────────────────>│
     │                    │                    │
     │                    │ User data          │
     │                    │<───────────────────┤
     │                    │                    │
     │                    │ 6. Check is_active │
     │                    │                    │
     │                    │ 7. Attach to req   │
     │                    │    (request.user)  │
     │                    │                    │
     │ 200 OK             │                    │
     │ {data}             │                    │
     │<───────────────────┤                    │
     │                    │                    │
```

### JWT Auth Guard

**File:** `apps/be/src/modules/auth/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Usage in Controllers:**
```typescript
@UseGuards(JwtAuthGuard)
@Controller('protected')
export class ProtectedController {
  // All endpoints require valid JWT token
}
```

---

## Role-Based Access Control (RBAC)

### User Roles

> **Phase 2C (Current):** SEKAR uses 8 roles. See [ADR-009](../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md) for migration from the original 3-role system.

```typescript
export enum UserRole {
  SATGAS = 'satgas',               // Field worker (was 'worker')
  LINMAS = 'linmas',               // Security officer
  KORLAP = 'korlap',              // Field coordinator (was 'koordinator_lapangan')
  ADMIN_DATA = 'admin_data',       // Data administrator
  KEPALA_RAYON = 'kepala_rayon',   // Rayon manager
  TOP_MANAGEMENT = 'top_management', // City-wide view
  ADMIN_SYSTEM = 'admin_system',   // System administrator (was 'admin')
  SUPERADMIN = 'superadmin',       // Full system access
}
```

### Role Hierarchy (Phase 2C)

```
┌──────────────────────────────────────┐
│    SUPERADMIN / ADMIN_SYSTEM         │  System administration
│  - Full system access                │
│  - User management                   │
│  - System configuration              │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│         TOP_MANAGEMENT               │  City-wide oversight
│  - View all rayons/areas             │
│  - Verify kepala_rayon tasks         │
│  - Analytics & monitoring            │
└──────────────────────────────────────┘
                ▲
┌──────────────────────────────────────┐
│         KEPALA_RAYON                 │  Rayon management
│  - Manage rayon scope                │
│  - Approve korlap/admin_data work    │
│  - Verify korlap tasks              │
└──────────────────────────────────────┘
                ▲
┌──────────────────────────────────────┐
│    KORLAP / ADMIN_DATA               │  Area coordination
│  - Korlap: field coordination        │
│  - Admin_data: data management       │
│  - Approve satgas/linmas activities  │
└──────────────────────────────────────┘
                ▲
┌──────────────────────────────────────┐
│       SATGAS / LINMAS                │  Field workers
│  - Clock in/out, submit activities   │
│  - Accept/decline tasks              │
│  - View own data only                │
└──────────────────────────────────────┘
```

### Roles Decorator

**File:** `apps/be/src/modules/auth/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

### Roles Guard

**File:** `apps/be/src/modules/auth/guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. If no roles specified, allow access
    if (!requiredRoles) {
      return true;
    }

    // 3. Get user from request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // 4. Check if user's role is in required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### Usage in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)  // Apply both guards
export class UsersController {

  // Only admin_system/superadmin can create users
  @Post()
  @Roles(UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // Supervisory+ roles can list users (scoped by rayon/area)
  @Get()
  @Roles(UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.TOP_MANAGEMENT, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  // Field workers can clock in
  @Post('clock-in')
  @Roles(UserRole.SATGAS, UserRole.LINMAS)
  clockIn(@GetUser() user: User, @Body() dto: ClockInDto) {
    return this.shiftsService.clockIn(user.id, dto);
  }
}
```

**Important:** Guards are executed in order:
1. `JwtAuthGuard` validates token and attaches user to request
2. `RolesGuard` checks if user's role matches required roles

---

## Get User Decorator

Custom decorator to extract authenticated user from request.

**File:** `apps/be/src/modules/auth/decorators/get-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Usage:**
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async getMe(@GetUser() user: User): Promise<MeResponseDto> {
  // Returns typed MeResponseDto with area/rayon resolution
  // For korlap: uses User.area_id (permanent assignment)
  // For satgas/linmas: resolves area from active Schedule
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    area_id: user.area_id || null,  // resolved from schedule if needed
    rayon_id: user.rayon_id || null,
    created_at: user.created_at,
    assigned_area: { id, name, gps_lat, gps_lng, radius_meters, area_type },
  };
}
```

---

## Permission Matrix (Phase 2C — 8 Roles)

> **Role Groups** are defined in `apps/be/src/modules/users/constants/role-groups.ts`. Endpoints use role group constants (e.g., `FIELD_WORKERS`, `TASK_RECEIVERS`, `ACTIVITY_APPROVERS`) rather than individual roles.

### Key Role Groups

| Group | Roles | Purpose |
|-------|-------|---------|
| `FIELD_WORKERS` | satgas, linmas | Clock-in/out, submit activities |
| `ALL_WORKERS` | satgas, linmas, korlap, admin_data | Activity submission |
| `TASK_RECEIVERS` | satgas, linmas, korlap, kepala_rayon | Accept/decline tasks |
| `TASK_CREATORS` | korlap, kepala_rayon, top_management, admin_system, superadmin | Create/assign tasks |
| `TASK_VERIFIERS` | korlap, kepala_rayon, top_management | Verify completed tasks |
| `ACTIVITY_APPROVERS` | korlap, kepala_rayon | Approve/reject activities |
| `SUPERVISORS` | korlap, kepala_rayon, top_management | Monitoring, oversight |
| `ADMINS` | admin_system, superadmin | System management |

### Users Module

| Endpoint | Field Workers | Korlap | Kepala Rayon | Top Mgmt | Admin Sys | Superadmin |
|----------|--------------|--------|-------------|----------|-----------|------------|
| `POST /users` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `GET /users` | ❌ | ✅* | ✅* | ✅ | ✅ | ✅ |
| `PATCH /users/:id` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `DELETE /users/:id` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

*Scoped: korlap sees own area, kepala_rayon sees own rayon

### Activities Module (Phase 2C)

| Endpoint | Satgas/Linmas | Korlap | Admin Data | Kepala Rayon | Top Mgmt+ |
|----------|--------------|--------|-----------|-------------|-----------|
| `POST /activities` | ✅ (own shift) | ✅ | ✅ | ❌ | ❌ |
| `GET /activities` | ✅ (own) | ✅* | ✅ | ✅* | ✅ |
| `PATCH /activities/:id/approve` | ❌ | ✅* | ❌ | ✅* | ❌ |
| `PATCH /activities/:id/reject` | ❌ | ✅* | ❌ | ✅* | ❌ |

*Scoped: hierarchical approval (korlap→satgas/linmas, kepala_rayon→korlap/admin_data)

### Tasks Module (Phase 2C)

| Endpoint | Satgas/Linmas | Korlap | Kepala Rayon | Top Mgmt | Admin Sys+ |
|----------|--------------|--------|-------------|----------|------------|
| `POST /tasks` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /tasks/my-tasks` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /tasks/:id/accept` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `POST /tasks/:id/decline` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `PATCH /tasks/:id/start` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `PATCH /tasks/:id/complete` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `PATCH /tasks/:id/verify` | ❌ | ✅* | ✅* | ✅ | ❌ |
| `PATCH /tasks/:id/revision` | ❌ | ✅* | ✅* | ✅ | ❌ |

*Scoped: hierarchical verification (korlap→satgas/linmas, kepala_rayon→korlap, top_mgmt→kepala_rayon)

### Shifts Module

| Endpoint | Field Workers | Korlap+ | Admin Sys+ |
|----------|--------------|---------|------------|
| `POST /shifts/clock-in` | ✅ (own) | ✅ (own) | ❌ |
| `POST /shifts/clock-out` | ✅ (own) | ✅ (own) | ❌ |
| `GET /shifts/current` | ✅ (own) | ✅ (own) | ❌ |
| `GET /shifts/active` | ❌ | ✅* | ✅ |

### Monitoring Module (Phase 2D)

| Endpoint | satgas | linmas | korlap | admin_data | kepala_rayon | top_management | admin_system | superadmin |
|----------|--------|--------|--------|------------|-------------|---------------|-------------|-----------|
| GET /monitoring/city | - | - | - | - | - | ✅ | ✅ | ✅ |
| GET /monitoring/rayon/:id | - | - | - | - | ✅ (own) | ✅ | ✅ | ✅ |
| GET /monitoring/area/:id | - | - | ✅ (own) | - | ✅ (own rayon) | ✅ | ✅ | ✅ |
| GET /monitoring/live-users | - | - | ✅ (own area) | - | ✅ (own rayon) | ✅ | ✅ | ✅ |
| GET /monitoring/users/:id/location-history | - | - | ✅ (own area) | - | ✅ (own rayon) | ✅ | ✅ | ✅ |
| GET /monitoring/users/:id/day-summary | - | - | ✅ (own area) | - | ✅ (own rayon) | ✅ | ✅ | ✅ |
| GET /monitoring/staffing-summary | - | - | ✅ (own area) | - | ✅ (own rayon) | ✅ | ✅ | ✅ |
| GET /monitoring/config | - | - | - | - | - | - | ✅ | ✅ |
| PATCH /monitoring/config/:key | - | - | - | - | - | - | ✅ | ✅ |
| GET /areas/:id/boundary | - | - | - | - | - | - | ✅ | ✅ |
| PUT /areas/:id/boundary | - | - | - | - | - | - | ✅ | ✅ |
| GET /monitoring/boundaries | - | - | ✅ (own area) | - | ✅ (own rayon) | ✅ | ✅ | - |
| POST /monitoring/reassign | - | - | ✅* (own area) | - | ✅ | ✅ | ✅ | - |
| GET /monitoring/config | - | - | - | - | - | - | ✅ | ✅ |
| PUT /monitoring/config | - | - | - | - | - | - | ✅ | ✅ |

*korlap can only reassign workers within their own area

**Scope Rules:**
- `korlap`: Filtered to own area_id automatically
- `kepala_rayon`: Filtered to own rayon_id automatically
- `top_management`, `admin_system`, `superadmin`: No scope restrictions
- `satgas`, `linmas`, `admin_data`: No direct monitoring access (they are monitored, not monitors)

**WebSocket Room Assignment:**
- `superadmin`, `admin_system`, `top_management` → join `city` room
- `kepala_rayon`, `admin_data` → join `rayon:{rayon_id}` room
- `korlap` → join `area:{area_id}` room

**Legend:**
- ✅ = Allowed
- ❌ = Forbidden (403 Forbidden)
- `-` = No access
- `(own)` = Can only access own resources
- `*` = Scoped to area/rayon

### Monitoring Scope-Based Authorization (Phase 2D)

Monitoring endpoints enforce scope-based authorization at the service level. The requesting user's `rayon_id` and `area_id` are extracted from the JWT token and used to filter results automatically.

| Role | Monitoring Scope | Details |
|------|-----------------|---------|
| `top_management` | All rayons, all areas, all workers | City-wide visibility with no scope restrictions |
| `admin_system` | All rayons, all areas, all workers | Full system access for administration and configuration |
| `kepala_rayon` | Own rayon's areas and workers only | Filtered by `rayon_id` from JWT; cannot see other rayons |
| `korlap` | Own area's workers only | Filtered by `area_id` from JWT; cannot see other areas |
| `satgas`, `linmas` | No monitoring access | Field workers are monitored, not monitors |
| `admin_data` | No monitoring access | Data entry role; no real-time monitoring privileges |
| `superadmin` | All rayons, all areas, all workers | Full access including config management |

**Enforcement mechanism:** The `MonitoringService` reads `user.rayon_id` and `user.area_id` from the authenticated request (populated by JWT strategy) and applies WHERE clauses to all database queries. A `kepala_rayon` requesting `/monitoring/live-users` will only receive users whose area belongs to their rayon. A `korlap` will only receive users assigned to their specific area. Requests for resources outside the user's scope return 403 Forbidden.

---

## Password Security

### Hashing Algorithm

SEKAR uses **bcrypt** for password hashing with 10 salt rounds.

**File:** `apps/be/src/modules/users/users.service.ts`

```typescript
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.SALT_ROUNDS,
    );

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        this.SALT_ROUNDS,
      );
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }
}
```

### Password Verification

**File:** `apps/be/src/modules/auth/auth.service.ts`

```typescript
async login(loginDto: LoginDto): Promise<AuthResponseDto> {
  const user = await this.usersService.findByUsername(loginDto.username);

  // Verify password with bcrypt
  const isPasswordValid = await bcrypt.compare(
    loginDto.password,
    user.password,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // ... generate token
}
```

### Why Bcrypt?

1. **Adaptive:** Can increase cost factor as hardware improves
2. **Salt Included:** Automatically generates and stores salt
3. **Slow by Design:** Makes brute-force attacks impractical
4. **Industry Standard:** Well-tested and widely used
5. **Rainbow Table Protection:** Unique salt per password

### Password Requirements

**Phase 1 MVP:**
- Minimum 6 characters

**Phase 2+ (Planned):**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Implementation:**
```typescript
import { Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password too weak' },
  )
  password: string;
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION=7d

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db

# CORS Configuration
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
```

### JWT Module Configuration

**File:** `apps/be/src/modules/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Swagger Integration

### Bearer Authentication

**File:** `apps/be/src/main.ts`

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('SEKAR API')
    .setDescription('Worker Tracking and Task Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
```

### Controller Decoration

```typescript
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('protected')
@ApiBearerAuth('JWT-auth')  // Adds "Authorize" button in Swagger UI
export class ProtectedController {
  // ...
}
```

---

## Security Best Practices

### 1. Token Storage (Client-Side)

**Mobile (React Native):**
```typescript
import EncryptedStorage from 'react-native-encrypted-storage';

// Store token securely
await EncryptedStorage.setItem('auth_token', token);

// Retrieve token
const token = await EncryptedStorage.getItem('auth_token');

// Remove token (logout)
await EncryptedStorage.removeItem('auth_token');
```

**Web (HttpOnly Cookie - Phase 6):**
```typescript
// Backend sets cookie
response.cookie('auth_token', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### 2. Token Refresh ✅ (Implemented Phase 1)

**Status:** ✅ Implemented in Phase 1 (January 2026)

The refresh token flow allows clients to obtain new access tokens without re-authenticating.

#### Endpoint: POST /api/v1/auth/refresh

**Request:**
```typescript
{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Response (Success):**
```typescript
{
  "access_token": "eyJhbGci...",  // New 15-minute access token
  "refresh_token": "f6e5d4c3b2a1...",  // New refresh token (rotation)
  "expires_in": 900,  // 15 minutes in seconds
  "token_type": "Bearer"
}
```

**Response (Error):**
```typescript
{
  "statusCode": 401,
  "message": "Invalid or expired refresh token",
  "error": "Unauthorized"
}
```

#### Token Rotation (Security Feature)

Refresh tokens are **one-time use only**. Each refresh operation:
1. Validates the provided refresh token
2. Revokes the old refresh token
3. Issues a new access token
4. Issues a new refresh token

This prevents token replay attacks and limits the impact of stolen refresh tokens.

#### Implementation

```typescript
// File: apps/be/src/modules/auth/auth.controller.ts
@Post('refresh')
@ApiOperation({ summary: 'Refresh access token' })
@ApiBody({ type: RefreshTokenDto })
@ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
@ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
  return this.authService.refreshAccessToken(dto.refresh_token);
}

// File: apps/be/src/modules/auth/auth.service.ts
async refreshAccessToken(refreshToken: string): Promise<AuthResponseDto> {
  try {
    // 1. Verify refresh token signature
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    // 2. Find user
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Revoke old refresh token (one-time use)
    await this.revokeRefreshToken(refreshToken);

    // 4. Generate new token pair
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 900, // 15 minutes
    };
  } catch (error) {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }
}
```

#### Mobile Client Implementation

```typescript
// File: apps/mobile/src/services/api/apiClient.ts
import axios from 'axios';

// Axios interceptor for auto token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from secure storage
        const refreshToken = await getSecureItem('refresh_token');

        // Call refresh endpoint
        const response = await axios.post('/auth/refresh', { refresh_token: refreshToken });

        // Store new tokens
        await setSecureItem('access_token', response.data.access_token);
        await setSecureItem('refresh_token', response.data.refresh_token);

        // Retry original request with new access token
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### 3. Token Revocation (Phase 2+)

Implement token blacklist for logout:

```typescript
// Redis-based blacklist
async logout(token: string) {
  const decoded = this.jwtService.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);

  // Store in Redis until expiration
  await this.redis.setex(`blacklist:${token}`, ttl, '1');
}
```

### 4. Rate Limiting (Phase 2+)

Prevent brute-force attacks:

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';

@Post('login')
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 5 attempts per 60 seconds
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

### 5. Logging & Monitoring

Log authentication events:

```typescript
// Log successful login
this.logger.log(`User ${user.id} logged in successfully`);

// Log failed login
this.logger.warn(`Failed login attempt for username: ${username}`);

// Log unauthorized access
this.logger.warn(`Unauthorized access attempt to ${endpoint} by user ${userId}`);
```

### 6. HTTPS Only

Production configuration:

```typescript
// Enforce HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 7. CORS Configuration

**File:** `apps/be/src/main.ts`

```typescript
app.enableCors({
  origin: [
    'http://localhost:19006', // Expo dev
    'http://10.0.2.2:19006',  // Android emulator
    'https://sekar.wahyutrip.com', // Production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Error Handling

### Common Authentication Errors

#### 401 Unauthorized - Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### 401 Unauthorized - Invalid Token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 401 Unauthorized - Expired Token
```json
{
  "statusCode": 401,
  "message": "jwt expired",
  "error": "Unauthorized"
}
```

#### 403 Forbidden - Insufficient Permissions
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### Custom Exception Filter

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, UnauthorizedException } from '@nestjs/common';

@Catch(UnauthorizedException)
export class UnauthorizedExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(401).json({
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
    });
  }
}
```

---

## Testing Authentication

### Unit Tests

**File:** `apps/be/src/modules/auth/auth.service.spec.ts`

```typescript
describe('AuthService', () => {
  it('should return JWT token on valid login', async () => {
    const result = await service.login({
      username: 'satgas1',
      password: 'Password123!',
    });

    expect(result).toHaveProperty('access_token');
    expect(result.user).toEqual({
      id: expect.any(String),
      username: 'satgas1',
      full_name: 'Satgas Satu',
      role: 'satgas',
    });
  });

  it('should throw UnauthorizedException on invalid password', async () => {
    await expect(
      service.login({
        username: 'satgas1',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

### Integration Tests

```bash
# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"satgas1","password":"Password123!"}' \
  | jq -r '.access_token'

# Use token to access protected endpoint
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbG..."
```

---

## Appendix: Constants

**File:** `apps/be/src/common/constants/auth.constants.ts`

```typescript
export const AUTH_CONSTANTS = {
  JWT_EXPIRATION: '7d',
  SALT_ROUNDS: 10,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 100,
  TOKEN_TYPE: 'Bearer',
} as const;
```

---

---

## Phase 2E: Planned Authentication Changes (Client Feedback II)

> **Full specification:** See [build history](../history/CHANGELOG.md)
> **ADR:** [ADR-012: Phone Number Login](../architecture/decisions/ADR-012-phone-number-login.md)

### Dual-Identifier Login

The `LoginDto` changes from `{ username, password }` to `{ identifier, password }`. The `identifier` field accepts either a username or an Indonesian phone number (starting with `0` or `+62`).

```typescript
// LoginDto (Phase 2E)
export class LoginDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // username OR phone_number

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
```

**Auth service detection logic:**
```typescript
async login(loginDto: LoginDto): Promise<AuthResponseDto> {
  const { identifier, password } = loginDto;
  const isPhone = /^(\+62|0)\d+$/.test(identifier);

  let user: User | null;
  if (isPhone) {
    user = await this.usersService.findByPhoneNumber(identifier);
  }
  if (!user) {
    user = await this.usersService.findByUsername(identifier);
  }

  if (!user || !user.is_active) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  // ... rest of login flow unchanged
}
```

**Breaking change:** `username` field removed from LoginDto, replaced by `identifier`. Requires simultaneous frontend + backend deployment.

### Updated Permission Matrix (Phase 2E)

**Shifts Module (expanded CLOCKABLE_ROLES):**

| Endpoint | satgas | linmas | korlap | admin_data | kepala_rayon | top_mgmt+ |
|----------|--------|--------|--------|------------|--------------|-----------|
| `POST /shifts/clock-in` | ✅ | ✅ | ✅ | **✅ (NEW)** | **✅ (NEW)** | ❌ |
| `POST /shifts/clock-out` | ✅ | ✅ | ✅ | **✅ (NEW)** | **✅ (NEW)** | ❌ |

**Monitoring Module (admin_data scope correction):**

The Phase 2D matrix listed admin_data as "No monitoring access." This is **incorrect** — admin_data already has monitoring access via `MONITORING_RAYON` group since Phase 2C. Phase 2E confirms and documents this:

| Endpoint | admin_data (corrected) |
|----------|----------------------|
| GET /monitoring/live-users | ✅ (own rayon) |
| GET /monitoring/area/:id | ✅ (own rayon areas) |
| GET /monitoring/rayon/:id | ✅ (own rayon) |

**WebSocket Room (korlap multi-area):**
- `korlap` → joins `area:{area_id}` rooms for **each assigned area** (was single room)

### New Endpoints (Phase 2E)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/users/:id/profile-picture` | All (own), admin_system, superadmin | Upload profile picture |
| GET | `/users/:id/areas` | admin_system, superadmin, korlap (own) | Get user area assignments |
| POST | `/users/:id/areas` | admin_system, superadmin | Assign areas to user |
| DELETE | `/users/:userId/areas/:areaId` | admin_system, superadmin | Remove area assignment |
| POST | `/overtime/start` | CLOCKABLE_ROLES | Start overtime (clock-in) |
| POST | `/overtime/:id/end` | CLOCKABLE_ROLES | End overtime (clock-out + activity) |
| GET | `/overtime/active` | CLOCKABLE_ROLES | Get active overtime |
| GET | `/audit/:entityType/:entityId` | Scoped by role hierarchy | Get entity audit trail |

---

**Document Version:** 2.3.0
**Last Updated:** 2026-03-10
**Phase:** 2E Planned - Dual-identifier login, expanded clockable roles, multi-area authorization
**Related Documents:**
- [contracts.md](./contracts.md) - API endpoint specifications
- [error-handling.md](./error-handling.md) - Error handling patterns
- [../architecture/security.md](../architecture/security.md) - Security architecture
- [Phase 2E Backend](../history/CHANGELOG.md) - Full Phase 2E backend specs
