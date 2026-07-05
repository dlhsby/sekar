# Database Migration Strategy

## Overview

This document outlines the database migration strategy for SEKAR using TypeORM. It covers migration creation, execution, rollback procedures, and best practices for managing schema changes.

**Migration Tool:** TypeORM CLI
**Node Version:** >=24.13
**TypeScript Version:** 5.x
**Current Strategy:** Auto-synchronize in development, migrations in production
**Authority:** Current migrations live in `apps/be/src/database/migrations/` (see `COMPLETION_STATUS.md` for table count)

---

## Migration Philosophy

### Two Configuration Variables

SEKAR uses two environment variables to control database schema management:

| Variable | Controls | Values |
|----------|----------|--------|
| `DATABASE_SYNCHRONIZE` | Auto-create tables from entity definitions | `true` / `false` |
| `DATABASE_MIGRATIONS_RUN` | Auto-run pending migrations on app startup | `true` / `false` |

**Configured in:** `apps/be/src/app.module.ts` (lines 59, 82)

```typescript
TypeOrmModule.forRoot({
  // ...
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
})
```

### Development vs Production

**Development Environment (Fast Iteration):**
```bash
DATABASE_SYNCHRONIZE=true      # Auto-create tables from entities
DATABASE_MIGRATIONS_RUN=false  # Migrations not needed yet
```

**Benefits:**
- ✅ Schema changes applied automatically on app start
- ✅ No migration files needed during development
- ✅ Faster development cycle, less overhead
- ✅ Perfect for rapid prototyping and feature building

**Development Environment (Pre-Deployment Testing):**
```bash
DATABASE_SYNCHRONIZE=false     # No auto-schema changes
DATABASE_MIGRATIONS_RUN=true   # Auto-run migrations on startup
```

**Benefits:**
- ✅ Tests the same workflow as production
- ✅ Catches migration bugs before deployment
- ✅ Ensures migrations are complete and correct
- ✅ Use this before pushing to production!

**Production Environment (Initial Setup):**
```bash
DATABASE_SYNCHRONIZE=true      # Create tables on empty database
DATABASE_MIGRATIONS_RUN=false  # Manual migration control
```

**Benefits:**
- ✅ Creates tables when database is empty
- ✅ No migrations needed for initial deployment
- ⚠️ **CRITICAL:** Change to `false` immediately after initial setup!

**Production Environment (After Initial Setup):**
```bash
DATABASE_SYNCHRONIZE=false     # NEVER auto-alter schema in production!
DATABASE_MIGRATIONS_RUN=false  # Manual migration control for zero-downtime
```

**Benefits:**
- ✅ Prevents accidental schema changes causing data loss
- ✅ Manual migration execution = zero-downtime deployments
- ✅ Migration failures don't crash the app
- ✅ Full control over when schema changes happen

### Why Manual Migrations in Production?

**Problem with `DATABASE_MIGRATIONS_RUN=true`:**

```bash
# Scenario: Deploy with failed migration
DATABASE_MIGRATIONS_RUN=true
docker-compose up -d

# What happens:
# 1. Container starts
# 2. App runs migration
# 3. Migration FAILS (syntax error, constraint violation, etc.)
# 4. App CRASHES and won't start
# 5. DOWNTIME until migration is fixed
```

**Solution with `DATABASE_MIGRATIONS_RUN=false`:**

```bash
# Correct workflow
DATABASE_MIGRATIONS_RUN=false

# 1. Run migration BEFORE restarting app (old code still running)
docker-compose run --rm backend npm run migration:run:prod

# 2. Migration fails? No problem - app still running!
# 3. Fix migration, retry, no downtime

# 4. Only restart app after migration succeeds
docker-compose up -d
```

### Why This Approach?

1. **Speed in Development** - Synchronize mode lets developers iterate quickly
2. **Safety in Production** - Manual migrations prevent accidental schema changes and downtime
3. **Testing Before Deployment** - Migration mode catches bugs early
4. **Version Control** - Migration files are code reviewed before production
5. **Rollback Capability** - Failed migrations can be reverted easily
6. **Zero-Downtime** - Migrations run while old code continues serving traffic
7. **Audit Trail** - Clear history of all schema changes

---

## TypeORM Configuration

### Development Configuration

```typescript
// apps/be/src/database/typeorm.config.ts (development)
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'sekar_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: true,  // ✅ AUTO-SYNC IN DEVELOPMENT
  logging: false,
});
```

### Production Configuration

```typescript
// apps/be/src/database/typeorm.config.ts (production)
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/database/migrations/*{.ts,.js}'],
  synchronize: false,  // ❌ NO AUTO-SYNC IN PRODUCTION
  migrationsRun: false, // Run migrations manually
  logging: ['error', 'warn', 'migration'],
});
```

---

## Migration File Structure

### Directory Layout

```
apps/be/
├── src/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 1704441600000-InitialSchema.ts
│   │   │   ├── 1704528000000-AddAreaTypes.ts
│   │   │   ├── 1704614400000-AddWorkerAssignments.ts
│   │   │   ├── 1704700800000-AddShifts.ts
│   │   │   └── 1704787200000-AddReportsAndLocation.ts
│   │   ├── seeds/
│   │   │   ├── seed.service.ts
│   │   │   └── seed.module.ts
│   │   └── typeorm.config.ts
│   └── modules/
│       └── */entities/*.entity.ts
```

### Migration Naming Convention

**Format:** `{timestamp}-{DescriptiveName}.ts`

**Examples:**
- `1704441600000-InitialSchema.ts` - Initial database setup
- `1704528000000-AddAreaTypes.ts` - Add area_types table
- `1704614400000-AddIndexes.ts` - Add performance indexes
- `1704700800000-AlterUsersAddPhone.ts` - Add phone column to users

**Timestamp Format:**
- Unix timestamp in milliseconds (13 digits)
- Generated automatically by TypeORM CLI
- Ensures chronological order

**Naming Guidelines:**
- Use PascalCase for description
- Start with action verb (Add, Alter, Remove, Create)
- Be specific and descriptive
- Avoid generic names like "UpdateSchema"

---

## Creating Migrations

### Method 1: Generate from Entity Changes (Recommended)

**Step 1: Modify Entity**
```typescript
// src/modules/users/entities/user.entity.ts
@Entity('users')
export class User {
  // ... existing fields ...

  @Column({ nullable: true })
  phone_number: string;  // NEW FIELD ADDED
}
```

**Step 2: Generate Migration**
```bash
cd be
npm run typeorm:generate -- src/database/migrations/AddPhoneToUsers
```

TypeORM will:
1. Compare current database schema with entity definitions
2. Generate SQL for the differences
3. Create migration file with up/down methods

**Generated Migration:**
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToUsers1704441600000 implements MigrationInterface {
  name = 'AddPhoneToUsers1704441600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "phone_number" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone_number"
    `);
  }
}
```

### Method 2: Create Empty Migration

For manual SQL or complex changes:

```bash
cd be
npm run typeorm:create -- src/database/migrations/AddCustomIndexes
```

**Manually Write Migration:**
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomIndexes1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create partial index for active shifts
    await queryRunner.query(`
      CREATE INDEX idx_shifts_active
      ON shifts(worker_id, clock_out_time)
      WHERE clock_out_time IS NULL
    `);

    // Create composite index for location logs
    await queryRunner.query(`
      CREATE INDEX idx_location_logs_worker_time
      ON location_logs(worker_id, logged_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_worker_time`);
  }
}
```

---

## Running Migrations

### Check Migration Status

```bash
cd be
npm run typeorm:show
```

Output shows:
- ✅ Migrations that have run
- ⏳ Pending migrations
- Migration timestamps and names

### Run Pending Migrations

```bash
cd be
npm run typeorm:run
```

**What happens:**
1. TypeORM checks `migrations` table for executed migrations
2. Runs pending migrations in chronological order (timestamp)
3. Records each migration in `migrations` table
4. Stops on first error (transactional)

**Output:**
```
Migration AddPhoneToUsers1704441600000 is starting...
Migration AddPhoneToUsers1704441600000 has been executed successfully.
Migration AddCustomIndexes1704528000000 is starting...
Migration AddCustomIndexes1704528000000 has been executed successfully.
```

### Dry Run (Preview SQL)

```bash
cd be
npm run typeorm:run -- --dry-run
```

Shows SQL that would be executed without actually running it.

---

## Rolling Back Migrations

### Revert Last Migration

```bash
cd be
npm run typeorm:revert
```

**What happens:**
1. Finds the most recent executed migration
2. Runs its `down()` method
3. Removes entry from `migrations` table

**Example:**
```
Migration AddPhoneToUsers1704441600000 is reverting...
Migration AddPhoneToUsers1704441600000 has been reverted successfully.
```

### Revert Multiple Migrations

```bash
# Revert last 3 migrations
npm run typeorm:revert
npm run typeorm:revert
npm run typeorm:revert
```

**No bulk revert command** - Must run individually for safety.

### Revert to Specific Migration

Not directly supported by TypeORM. Workaround:

```bash
# Manually revert to specific timestamp
npm run typeorm:revert  # Until you reach desired state
```

---

## Migration Best Practices

### 1. Always Include Down Migrations

**Good:**
```typescript
export class AddEmailToUsers1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD "email" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "email"
    `);
  }
}
```

**Bad:**
```typescript
public async down(queryRunner: QueryRunner): Promise<void> {
  // Empty or throws error - NO ROLLBACK POSSIBLE
  throw new Error('Cannot revert this migration');
}
```

### 2. Use Transactions for Safety

TypeORM runs migrations in transactions by default. For multiple operations:

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // All queries run in single transaction
  await queryRunner.query(`CREATE TABLE temp_table (...)`);
  await queryRunner.query(`INSERT INTO temp_table SELECT * FROM old_table`);
  await queryRunner.query(`DROP TABLE old_table`);
  await queryRunner.query(`ALTER TABLE temp_table RENAME TO old_table`);

  // If any query fails, entire migration is rolled back
}
```

### 3. Never Modify Existing Migrations

Once a migration is deployed to production:
- ❌ DO NOT modify its code
- ❌ DO NOT change its timestamp
- ❌ DO NOT delete it

Instead:
- ✅ Create a new migration to fix issues
- ✅ Version control all migrations

### 4. Test Migrations Locally First

```bash
# 1. Apply migration
npm run typeorm:run

# 2. Test application
npm run start:dev

# 3. Revert migration
npm run typeorm:revert

# 4. Verify revert worked
npm run start:dev

# 5. Apply again
npm run typeorm:run
```

### 5. Handle Data Migrations Carefully

**Example: Rename column with data preservation**

```typescript
export class RenameFullNameToName1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new column
    await queryRunner.query(`
      ALTER TABLE "users" ADD "name" VARCHAR(100)
    `);

    // Step 2: Copy data
    await queryRunner.query(`
      UPDATE "users" SET "name" = "full_name"
    `);

    // Step 3: Make new column NOT NULL
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL
    `);

    // Step 4: Drop old column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "full_name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the process
    await queryRunner.query(`
      ALTER TABLE "users" ADD "full_name" VARCHAR(100)
    `);
    await queryRunner.query(`
      UPDATE "users" SET "full_name" = "name"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "name"
    `);
  }
}
```

### 6. Use Raw SQL for Performance-Critical Operations

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Good: Use raw SQL for bulk operations
  await queryRunner.query(`
    UPDATE location_logs
    SET battery_level = 100
    WHERE battery_level IS NULL
  `);
}
```

```typescript
// Bad: Don't use TypeORM query builder in migrations
// (Slower, entity-dependent)
const logs = await queryRunner.manager.find(LocationLog, {
  where: { battery_level: IsNull() }
});
for (const log of logs) {
  log.battery_level = 100;
  await queryRunner.manager.save(log);
}
```

### 7. Add Indexes in Separate Migrations

```typescript
export class AddIndexes1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY idx_users_username
      ON users(username)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_users_username
    `);
  }
}
```

**Note:** `CONCURRENTLY` allows index creation without locking table.

---

## Common Migration Patterns

### Pattern 1: Add Table

```typescript
export class CreateAreasTable1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "areas" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "area_type_id" UUID NOT NULL,
        "gps_lat" DECIMAL(10, 8) NOT NULL,
        "gps_lng" DECIMAL(11, 8) NOT NULL,
        "radius_meters" INTEGER DEFAULT 100,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT "fk_areas_area_type"
          FOREIGN KEY ("area_type_id") REFERENCES "area_types"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "areas"`);
  }
}
```

### Pattern 2: Add Column

```typescript
export class AddPhoneToUsers1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "phone_number" VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone_number"
    `);
  }
}
```

### Pattern 3: Add Foreign Key

```typescript
export class AddWorkerIdToShifts1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shifts"
      ADD COLUMN "worker_id" UUID NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "shifts"
      ADD CONSTRAINT "fk_shifts_worker"
      FOREIGN KEY ("worker_id") REFERENCES "users"("id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_shifts_worker_id"
      ON "shifts"("worker_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_shifts_worker_id"`);
    await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "fk_shifts_worker"`);
    await queryRunner.query(`ALTER TABLE "shifts" DROP COLUMN "worker_id"`);
  }
}
```

### Pattern 4: Change Column Type

```typescript
export class ChangeUserIdToUuid1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop foreign keys referencing this column
    await queryRunner.query(`
      ALTER TABLE "worker_assignments"
      DROP CONSTRAINT "fk_worker_assignments_worker"
    `);

    // Step 2: Add new UUID column
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid()
    `);

    // Step 3: Update foreign key tables
    await queryRunner.query(`
      ALTER TABLE "worker_assignments"
      ADD COLUMN "worker_id_new" UUID
    `);

    // Step 4: Copy data
    await queryRunner.query(`
      UPDATE "worker_assignments" wa
      SET "worker_id_new" = u."id_new"
      FROM "users" u
      WHERE wa."worker_id" = u."id"
    `);

    // Step 5: Drop old columns
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "worker_assignments" DROP COLUMN "worker_id"`);

    // Step 6: Rename new columns
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "id_new" TO "id"`);
    await queryRunner.query(`ALTER TABLE "worker_assignments" RENAME COLUMN "worker_id_new" TO "worker_id"`);

    // Step 7: Re-add constraints
    await queryRunner.query(`
      ALTER TABLE "users" ADD PRIMARY KEY ("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "worker_assignments"
      ADD CONSTRAINT "fk_worker_assignments_worker"
      FOREIGN KEY ("worker_id") REFERENCES "users"("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse process (change UUID back to INTEGER)
    // Similar steps in reverse order
  }
}
```

### Pattern 5: Add Enum Constraint

```typescript
export class AddRoleCheckToUsers1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_role"
      CHECK ("role" IN ('worker', 'supervisor', 'admin'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "chk_users_role"
    `);
  }
}
```

---

## Deployment Workflow

### Development → Production Pipeline

**Step 1: Local Development**
```bash
# Make entity changes
# Test with synchronize: true
npm run start:dev
```

**Step 2: Generate Migration**
```bash
# Connect to production-like database
npm run typeorm:generate -- src/database/migrations/DescriptiveName
```

**Step 3: Review Migration**
```bash
# Check generated SQL
cat src/database/migrations/1704441600000-DescriptiveName.ts

# Test up migration
npm run typeorm:run

# Test down migration
npm run typeorm:revert

# Test up again
npm run typeorm:run
```

**Step 4: Commit to Git**
```bash
git add src/database/migrations/1704441600000-DescriptiveName.ts
git commit -m "feat(db): add phone_number to users table"
git push
```

**Step 5: Deploy to Staging**
```bash
# SSH to staging server
cd /app/sekar-backend
git pull
npm install
npm run build

# Run migrations
npm run typeorm:run

# Restart application
pm2 restart sekar-backend
```

**Step 6: Test Staging**
```bash
# Test new functionality
curl -X GET https://staging.sekar.example.com/api/users/me

# If issues, rollback
npm run typeorm:revert
pm2 restart sekar-backend
```

**Step 7: Deploy to Production**
```bash
# SSH to production server
cd /app/sekar-backend
git pull
npm install
npm run build

# Backup database first
pg_dump sekar_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run typeorm:run

# Restart application
pm2 restart sekar-backend
```

---

## Multi-Phase Migration Strategy

### Overview

SEKAR is developed in 6 phases over 16 weeks. Database migrations must support:
1. **Incremental rollout** - New features deployed phase by phase
2. **Backward compatibility** - Old code versions work with new schema
3. **Zero-downtime deployments** - No service interruption during migrations
4. **Rollback safety** - Can revert to previous phase if needed

---

### Phase-Based Migration Organization

**Migration Naming Convention:**

```
{timestamp}-Phase{N}-{FeatureName}.ts

Examples:
1704441600000-Phase1-InitialSchema.ts
1704787200000-Phase1-AddLocationTracking.ts
1705392000000-Phase2-AddTasks.ts
1705996800000-Phase2-AddNotifications.ts
1706601600000-Phase3-AddAnalytics.ts
```

**Benefits:**
- Clear phase boundaries for rollback
- Easy to identify which features require which migrations
- Simplifies dependency tracking

**Migration Folder Structure:**

```
apps/be/src/database/migrations/
├── phase-1/
│   ├── 1704441600000-Phase1-InitialSchema.ts
│   ├── 1704528000000-Phase1-AddAreaTypes.ts
│   ├── 1704614400000-Phase1-AddWorkerAssignments.ts
│   ├── 1704700800000-Phase1-AddShifts.ts
│   └── 1704787200000-Phase1-AddLocationTracking.ts
├── phase-2/
│   ├── 1705392000000-Phase2-AddTasks.ts
│   ├── 1705478400000-Phase2-AddNotifications.ts
│   └── 1705564800000-Phase2-AddKMZSupport.ts
├── phase-3/
│   ├── 1706601600000-Phase3-AddAnalytics.ts
│   └── 1706688000000-Phase3-AddReportBuilder.ts
└── README.md  # Phase migration index
```

---

### Backward Compatibility Rules

**Rule 1: Never Drop Columns in Same Deployment**

Use a **3-step migration** strategy for column removal:

**Step 1 (Deploy 1): Mark as deprecated, make nullable**
```typescript
export class DeprecateFullName1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make column nullable (prepare for removal)
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "full_name" DROP NOT NULL
    `);

    // Add comment marking deprecation
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."full_name"
      IS 'DEPRECATED: Use first_name and last_name instead. Will be removed in Phase 2.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "full_name" SET NOT NULL
    `);
  }
}
```

**Step 2 (App Code): Stop reading deprecated column**
- Update all queries to use new columns
- Deploy application code
- Monitor for 1-2 weeks

**Step 3 (Deploy 2): Drop column**
```typescript
export class RemoveDeprecatedFullName1704528000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "full_name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "full_name" VARCHAR(100)
    `);
    // Data loss on revert - acceptable for deprecated columns
  }
}
```

---

**Rule 2: Add Columns with Defaults**

New columns must have sensible defaults or be nullable to support old code.

**Good:**
```typescript
export class AddEmailToUsers1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "email" VARCHAR(255) DEFAULT 'noemail@sekar.local'
    `);
  }
}
```

**Bad:**
```typescript
// This breaks old code that doesn't know about email field
export class AddEmailToUsers1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "email" VARCHAR(255) NOT NULL  -- ❌ Old code can't insert
    `);
  }
}
```

**Correct Approach (2 steps):**

**Step 1: Add nullable column**
```typescript
export class AddEmailToUsers1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "email" VARCHAR(255)  -- Nullable, old code works
    `);
  }
}
```

**Step 2: Make required after code deployed**
```typescript
export class MakeEmailRequired1704528000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set default for existing rows
    await queryRunner.query(`
      UPDATE "users"
      SET "email" = username || '@sekar.local'
      WHERE "email" IS NULL
    `);

    // Now safe to make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "email" SET NOT NULL
    `);
  }
}
```

---

**Rule 3: Add Indexes Concurrently**

Create indexes without locking tables for production.

**Good (Zero Downtime):**
```typescript
export class AddUserEmailIndex1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY idx_users_email
      ON users(email)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_users_email
    `);
  }
}
```

**Caveat:** `CONCURRENTLY` cannot run in transaction. Wrap with special handling:

```typescript
export class AddUserEmailIndex1704441600000 implements MigrationInterface {
  // Disable transaction for this migration
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
      ON users(email)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_users_email
    `);
  }
}
```

---

**Rule 4: Rename via Aliasing**

Never rename columns/tables directly. Use views or dual writes.

**Pattern: Rename Column**

**Step 1: Add new column**
```typescript
await queryRunner.query(`
  ALTER TABLE "users" ADD COLUMN "phone_number" VARCHAR(20)
`);
```

**Step 2: Backfill data**
```typescript
await queryRunner.query(`
  UPDATE "users" SET "phone_number" = "phone" WHERE "phone" IS NOT NULL
`);
```

**Step 3: Create trigger for dual writes**
```typescript
await queryRunner.query(`
  CREATE OR REPLACE FUNCTION sync_phone_columns()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      NEW.phone_number := NEW.phone;
    END IF;
    IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
      NEW.phone := NEW.phone_number;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_sync_phone
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_phone_columns();
`);
```

**Step 4: Update application to use new column** (separate deploy)

**Step 5: Drop old column and trigger** (third deploy)

---

### Zero-Downtime Migration Patterns

**Pattern 1: Expand-Contract**

For breaking changes, use a two-phase approach:

**Phase 1 (Expand): Add new structure alongside old**
- Add new columns/tables
- Keep old columns/tables
- Application writes to both
- Application reads from old

**Phase 2 (Contract): Remove old structure**
- Application reads from new
- Remove old columns/tables

**Example: Split `full_name` into `first_name` and `last_name`**

**Expand Migration:**
```typescript
export class ExpandAddFirstLastName1704441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "first_name" VARCHAR(50),
      ADD COLUMN "last_name" VARCHAR(50)
    `);

    // Backfill existing data
    await queryRunner.query(`
      UPDATE "users"
      SET
        "first_name" = SPLIT_PART("full_name", ' ', 1),
        "last_name" = SUBSTRING("full_name" FROM POSITION(' ' IN "full_name") + 1)
      WHERE "full_name" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "first_name",
      DROP COLUMN "last_name"
    `);
  }
}
```

**Application Code (Deploy 1):**
```typescript
// Write to both old and new
async createUser(dto: CreateUserDto) {
  const user = new User();
  user.full_name = `${dto.first_name} ${dto.last_name}`;  // Old
  user.first_name = dto.first_name;  // New
  user.last_name = dto.last_name;     // New
  return this.usersRepository.save(user);
}

// Read from old (safe during transition)
async getUser(id: string) {
  const user = await this.usersRepository.findOne({ where: { id } });
  return {
    ...user,
    first_name: user.first_name || user.full_name?.split(' ')[0],
    last_name: user.last_name || user.full_name?.split(' ').slice(1).join(' '),
  };
}
```

**Application Code (Deploy 2, after 1 week):**
```typescript
// Stop using full_name
async getUser(id: string) {
  const user = await this.usersRepository.findOne({ where: { id } });
  return {
    ...user,
    // Only use new fields
  };
}
```

**Contract Migration (Deploy 3):**
```typescript
export class ContractRemoveFullName1704614400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "full_name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "full_name" VARCHAR(100)
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET "full_name" = CONCAT("first_name", ' ', "last_name")
    `);
  }
}
```

---

**Pattern 2: Blue-Green Schema**

For large refactoring, create parallel schema version.

**Use Case:** Phase 3 rewrites analytics with new table structure

**Step 1: Create new tables with `_v2` suffix**
```typescript
export class CreateAnalyticsV21706601600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "analytics_reports_v2" (
        -- New optimized structure
      )
    `);
  }
}
```

**Step 2: Dual write to both schemas**
```typescript
async createReport(data: ReportDto) {
  // Write to old schema (existing endpoints)
  await this.reportsRepository.save(data);

  // Write to new schema (Phase 3 endpoints)
  await this.reportsV2Repository.save(transformToV2(data));
}
```

**Step 3: Migrate old data in background**
```typescript
// Run as background job
async migrateAnalytics() {
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const oldReports = await this.reportsRepository.find({
      skip: offset,
      take: batchSize,
    });

    if (oldReports.length === 0) break;

    const newReports = oldReports.map(transformToV2);
    await this.reportsV2Repository.save(newReports);

    offset += batchSize;
    await sleep(100); // Throttle to avoid load
  }
}
```

**Step 4: Switch traffic to v2**
```typescript
// Feature flag in config
USE_ANALYTICS_V2=true

// Application code
async getReports() {
  if (config.USE_ANALYTICS_V2) {
    return this.reportsV2Repository.find();
  }
  return this.reportsRepository.find();
}
```

**Step 5: Drop old schema** (next phase)

---

### Cross-Phase Migration Dependencies

**Dependency Matrix:**

| Phase | Depends On | Migration Requirements |
|-------|-----------|------------------------|
| Phase 1 | - | Initial schema, no dependencies |
| Phase 2 | Phase 1 | Must run Phase 1 migrations first |
| Phase 3 | Phase 1, 2 | Analytics depends on reports (Phase 1) + tasks (Phase 2) |
| Phase 4 | Phase 1 | Assets independent of Phase 2/3 |
| Phase 5 | Phase 1, 4 | iOS needs asset QR codes |
| Phase 6 | Phase 1, 2 | Web dashboard needs basic API + tasks |

**Migration Dependency Checks:**

```typescript
// Add to each phase migration
export class Phase2AddTasks1705392000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check Phase 1 migrations ran
    const phase1Complete = await queryRunner.query(`
      SELECT COUNT(*) as count FROM migrations
      WHERE name LIKE '%Phase1%'
    `);

    if (phase1Complete[0].count < 5) {
      throw new Error('Phase 1 migrations must complete before Phase 2');
    }

    // Proceed with Phase 2 migration
    await queryRunner.query(`CREATE TABLE tasks (...)`);
  }
}
```

---

### Rolling Deployment Strategy

**Scenario:** 4 backend instances, rolling deployment updates one at a time.

**Timeline:**
```
T+0:  Instance 1 updated (v1.1) | Instances 2,3,4 still on v1.0
T+5:  Instance 2 updated (v1.1) | Instances 3,4 still on v1.0
T+10: Instance 3 updated (v1.1) | Instance 4 still on v1.0
T+15: Instance 4 updated (v1.1) | All instances on v1.1
```

**Database must support both v1.0 and v1.1 during T+0 to T+15**

**Safe Deployment:**

**Before rolling deployment:**
```bash
# 1. Run migrations (additive only)
npm run typeorm:run

# Migrations add new columns/tables but don't drop anything
```

**During rolling deployment:**
```bash
# 2. Deploy instance 1
kubectl set image deployment/sekar-backend sekar-backend=v1.1 --replicas=1

# 3. Wait for health check
kubectl wait --for=condition=ready pod -l app=sekar-backend

# 4. Deploy instance 2, 3, 4 sequentially
```

**After rolling deployment:**
```bash
# 5. All instances on v1.1, safe to run "contract" migrations
npm run typeorm:run

# Can now drop old columns/tables
```

---

### Feature Flag Coordination

Use feature flags to decouple code deployment from schema usage.

**Example: Phase 2 Task Assignment**

**Step 1: Deploy schema (behind flag)**
```typescript
// Migration creates table
export class Phase2AddTasks1705392000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE tasks (...)`);
  }
}
```

**Step 2: Deploy code with feature flag OFF**
```typescript
// .env
FEATURE_TASKS_ENABLED=false

// tasks.service.ts
async createTask(dto: CreateTaskDto) {
  if (!config.FEATURE_TASKS_ENABLED) {
    throw new ForbiddenException('Task feature not enabled');
  }
  // Task creation logic
}
```

**Step 3: Test internally with flag ON**
```typescript
// .env.staging
FEATURE_TASKS_ENABLED=true

// Test task assignment in staging
```

**Step 4: Enable in production gradually**
```typescript
// .env.production
FEATURE_TASKS_ENABLED=true

// Enable for all users
```

**Step 5: Remove feature flag (next phase)**
```typescript
// Remove flag checks from code
async createTask(dto: CreateTaskDto) {
  // Direct implementation, no flag check
}
```

---

### Migration Rollback Strategy

**Rollback Levels:**

1. **Application Rollback** - Revert code, keep schema
2. **Migration Rollback** - Revert schema changes
3. **Full Rollback** - Restore from database backup

**Decision Matrix:**

| Issue | Rollback Level | Command |
|-------|---------------|---------|
| Bug in business logic | Application only | `kubectl rollout undo deployment/sekar-backend` |
| Migration syntax error | Migration revert | `npm run typeorm:revert` |
| Data corruption | Database restore | `pg_restore backup.sql` |
| Performance regression | Application rollback + feature flag OFF | - |

**Safe Rollback Pattern:**

```bash
# 1. Disable new features via feature flags
kubectl set env deployment/sekar-backend FEATURE_TASKS_ENABLED=false

# 2. Rollback application code
kubectl rollout undo deployment/sekar-backend

# 3. Revert migrations (only if safe)
npm run typeorm:revert

# Caveat: Can only revert if no data written to new columns
```

**When Migrations Cannot Be Reverted:**

- Data written to new tables
- Old columns already dropped
- Constraints that would violate data integrity

**Solution: Forward-fix**
```typescript
// Instead of reverting, create new migration to fix
export class FixTaskAssignmentIssue1705478400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix the issue with new migration
    await queryRunner.query(`
      ALTER TABLE tasks ADD CONSTRAINT chk_valid_status
      CHECK (status IN ('pending', 'completed', 'cancelled'))
    `);
  }
}
```

---

### Migration Review Checklist

**Before merging Phase N migrations:**

- [ ] **Backward compatible:** Old code (Phase N-1) works with new schema
- [ ] **Forward compatible:** New code (Phase N) works with old schema during rollout
- [ ] **Additive only:** No dropped columns/tables in initial migration
- [ ] **Has down() migration:** Can revert if needed
- [ ] **Tested rollback:** `typeorm:revert` successfully restores old schema
- [ ] **Indexes use CONCURRENTLY:** No table locks during index creation
- [ ] **Feature flag ready:** New features hidden behind flags
- [ ] **Documented dependencies:** Clearly notes required prior migrations
- [ ] **Performance tested:** Won't slow down under production load
- [ ] **Naming follows convention:** `{timestamp}-Phase{N}-{Feature}.ts`

---

## Phase Migration Examples

### Phase 1 to Phase 2: Role Enum Migration

**Critical Migration:** The transition from Phase 1 to Phase 2 involves a breaking change in the role enum values. Phase 1 uses lowercase roles while Phase 2 uses PascalCase with an expanded set.

#### Role Mapping

| Phase 1 Role | Phase 2 Role | Notes |
|--------------|--------------|-------|
| `worker` | `Worker` | Direct mapping, case change only |
| `supervisor` | `KoordinatorLapangan` | Supervisor becomes area-level coordinator |
| `admin` | `Admin` | Direct mapping, case change only |
| (new) | `TopManagement` | New role for city-wide view |
| (new) | `KepalaRayon` | New role for rayon-level management |
| (new) | `Linmas` | New role for security officers |

#### Migration Strategy

**Option A: In-Place Migration (Recommended for small datasets)**

```typescript
// 1705000000000-Phase2-MigrateRoleEnum.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2MigrateRoleEnum1705000000000 implements MigrationInterface {
  name = 'Phase2MigrateRoleEnum1705000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Remove old CHECK constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "chk_users_role"
    `);

    // Step 2: Migrate existing role values
    await queryRunner.query(`
      UPDATE "users" SET role = 'Worker' WHERE role = 'worker'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'KoordinatorLapangan' WHERE role = 'supervisor'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'Admin' WHERE role = 'admin'
    `);

    // Step 3: Add new CHECK constraint with all Phase 2 roles
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_role"
      CHECK ("role" IN (
        'Admin', 'TopManagement', 'KepalaRayon',
        'KoordinatorLapangan', 'Worker', 'Linmas'
      ))
    `);

    // Step 4: Add rayon_id column for KepalaRayon assignment
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "rayon_id" UUID REFERENCES "rayons"("id") ON DELETE SET NULL
    `);

    // Step 5: Create index for rayon lookup
    await queryRunner.query(`
      CREATE INDEX "idx_users_rayon" ON "users"("rayon_id")
      WHERE "rayon_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Remove rayon index and column
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_rayon"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "rayon_id"`);

    // Step 2: Remove new CHECK constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "chk_users_role"
    `);

    // Step 3: Revert role values (may lose data for new roles)
    await queryRunner.query(`
      UPDATE "users" SET role = 'worker' WHERE role = 'Worker'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'worker' WHERE role = 'Linmas'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'supervisor' WHERE role = 'KoordinatorLapangan'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'supervisor' WHERE role = 'KepalaRayon'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'admin' WHERE role = 'TopManagement'
    `);
    await queryRunner.query(`
      UPDATE "users" SET role = 'admin' WHERE role = 'Admin'
    `);

    // Step 4: Restore old CHECK constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_role"
      CHECK ("role" IN ('worker', 'supervisor', 'admin'))
    `);
  }
}
```

#### Deployment Notes

1. **Pre-Migration Backup:**
   ```bash
   pg_dump sekar_db > backup_before_role_migration.sql
   ```

2. **Migration Order:**
   - Run `Phase2-AddRayons` migration first (rayons table must exist)
   - Then run `Phase2-MigrateRoleEnum` migration

3. **Application Code Updates:**
   - Update role constants/enums in backend code
   - Update role checks in guards and decorators
   - Update frontend role displays

4. **Rollback Considerations:**
   - New roles (`TopManagement`, `KepalaRayon`, `Linmas`) will be converted to Phase 1 equivalents
   - `TopManagement` → `admin`
   - `KepalaRayon` → `supervisor`
   - `Linmas` → `worker`
   - **Data about rayon assignments will be lost on rollback**

5. **Testing Checklist:**
   - [ ] Existing users can still login after migration
   - [ ] Role-based guards work with new role values
   - [ ] Supervisors converted to KoordinatorLapangan retain area access
   - [ ] Admins retain full system access
   - [ ] New role creation works (TopManagement, KepalaRayon, Linmas)

---

### Phase 2 Migration Examples

#### Example 1: Add Tasks Table

```typescript
// 1705392000000-Phase2-AddTasks.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2AddTasks1705392000000 implements MigrationInterface {
  name = 'Phase2AddTasks1705392000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "assigned_to" UUID,
        "assigned_by" UUID,
        "area_id" UUID,
        "priority" VARCHAR(20) DEFAULT 'normal',
        "status" VARCHAR(30) DEFAULT 'pending',
        "due_date" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "completion_photo_url" TEXT,
        "completion_notes" TEXT,
        "decline_reason" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,

        CONSTRAINT "fk_tasks_assigned_to"
          FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_assigned_by"
          FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_area"
          FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_task_priority"
          CHECK ("priority" IN ('low', 'normal', 'high', 'urgent')),
        CONSTRAINT "chk_task_status"
          CHECK ("status" IN ('pending', 'assigned', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
        CONSTRAINT "chk_task_completion"
          CHECK (
            ("status" = 'completed' AND "completed_at" IS NOT NULL) OR
            ("status" != 'completed')
          ),
        CONSTRAINT "chk_task_decline"
          CHECK (
            ("status" = 'declined' AND "decline_reason" IS NOT NULL) OR
            ("status" != 'declined')
          )
      )
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_assigned_status"
      ON "tasks"("assigned_to", "status", "due_date")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_area_status"
      ON "tasks"("area_id", "status", "created_at")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_overdue"
      ON "tasks"("due_date", "status")
      WHERE "status" NOT IN ('completed', 'cancelled') AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_overdue"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_area_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_assigned_status"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
  }
}
```

#### Example 2: Add Notifications Infrastructure

```typescript
// 1705478400000-Phase2-AddNotifications.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2AddNotifications1705478400000 implements MigrationInterface {
  name = 'Phase2AddNotifications1705478400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_tokens table
    await queryRunner.query(`
      CREATE TABLE "notification_tokens" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "token" TEXT NOT NULL,
        "platform" VARCHAR(20) NOT NULL,
        "device_id" VARCHAR(255),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_notification_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_notification_platform"
          CHECK ("platform" IN ('android', 'ios', 'web')),
        CONSTRAINT "uq_notification_tokens_user_token"
          UNIQUE ("user_id", "token")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notification_tokens_user"
      ON "notification_tokens"("user_id")
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "body" TEXT NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "data" JSONB,
        "read_at" TIMESTAMPTZ,
        "sent_at" TIMESTAMPTZ DEFAULT NOW(),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_notifications_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_notification_type"
          CHECK ("type" IN (
            'task_assigned', 'task_reminder', 'shift_reminder',
            'report_reviewed', 'report_comment', 'system', 'announcement'
          ))
      )
    `);

    // Add CRITICAL indexes
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_unread"
      ON "notifications"("user_id", "created_at" DESC)
      WHERE "read_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_all"
      ON "notifications"("user_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notifications_data"
      ON "notifications" USING GIN ("data")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_data"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_all"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_unread"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_tokens_user"`);
    await queryRunner.query(`DROP TABLE "notification_tokens"`);
  }
}
```

---

### Phase 3 Migration Examples

#### Example 1: Add Report Templates

```typescript
// 1706601600000-Phase3-AddReportTemplates.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3AddReportTemplates1706601600000 implements MigrationInterface {
  name = 'Phase3AddReportTemplates1706601600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create report_templates table
    await queryRunner.query(`
      CREATE TABLE "report_templates" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "report_type" VARCHAR(50) NOT NULL,
        "config" JSONB NOT NULL,
        "created_by" UUID,
        "is_system_template" BOOLEAN DEFAULT FALSE,
        "is_active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_report_templates_creator"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_report_type"
          CHECK ("report_type" IN (
            'worker_performance', 'area_coverage', 'operational',
            'attendance', 'task_completion', 'custom'
          ))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_report_templates_type"
      ON "report_templates"("report_type", "is_active")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_report_templates_config"
      ON "report_templates" USING GIN ("config")
    `);

    // Insert system templates
    await queryRunner.query(`
      INSERT INTO "report_templates" ("name", "description", "report_type", "config", "is_system_template")
      VALUES
        (
          'Worker Performance - Monthly',
          'Monthly worker performance metrics',
          'worker_performance',
          '{"date_range": "last_month", "columns": ["attendance_rate", "avg_shift_hours", "reports_count"]}'::jsonb,
          TRUE
        ),
        (
          'Area Coverage - Weekly',
          'Weekly area coverage summary',
          'area_coverage',
          '{"date_range": "last_week", "columns": ["days_covered", "total_reports", "avg_condition"]}'::jsonb,
          TRUE
        )
    `);

    // Create generated_reports table
    await queryRunner.query(`
      CREATE TABLE "generated_reports" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" UUID,
        "generated_by" UUID,
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" TEXT NOT NULL,
        "file_format" VARCHAR(20) NOT NULL,
        "file_size_bytes" INTEGER,
        "parameters" JSONB NOT NULL,
        "row_count" INTEGER,
        "generation_time_ms" INTEGER,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_generated_reports_template"
          FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_generated_reports_user"
          FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_file_format"
          CHECK ("file_format" IN ('pdf', 'csv', 'xlsx', 'json'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_generated_reports_created"
      ON "generated_reports"("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_generated_reports_created"`);
    await queryRunner.query(`DROP TABLE "generated_reports"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_templates_config"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_templates_type"`);
    await queryRunner.query(`DROP TABLE "report_templates"`);
  }
}
```

#### Example 2: Create Analytics Materialized Views

```typescript
// 1706688000000-Phase3-AddAnalyticsViews.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3AddAnalyticsViews1706688000000 implements MigrationInterface {
  name = 'Phase3AddAnalyticsViews1706688000000';

  // Disable transaction for CREATE INDEX CONCURRENTLY
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create worker performance materialized view
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW "mv_worker_performance" AS
      SELECT
        u.id as worker_id,
        u.full_name,
        u.phone,
        wa.area_id,
        a.name as area_name,
        COUNT(DISTINCT DATE(s.clock_in_time)) as days_worked,
        AVG(EXTRACT(EPOCH FROM (s.clock_out_time - s.clock_in_time)) / 3600) as avg_shift_hours,
        COUNT(r.id) as total_reports,
        SUM(CASE WHEN r.condition = 'Baik' THEN 1 ELSE 0 END) as good_reports,
        MAX(s.clock_in_time) as last_shift_date
      FROM users u
      LEFT JOIN worker_assignments wa ON u.id = wa.worker_id
      LEFT JOIN areas a ON wa.area_id = a.id
      LEFT JOIN shifts s ON u.id = s.worker_id AND s.deleted_at IS NULL
      LEFT JOIN work_reports r ON u.id = r.worker_id AND r.deleted_at IS NULL
      WHERE u.role = 'worker' AND u.deleted_at IS NULL
      GROUP BY u.id, u.full_name, u.phone, wa.area_id, a.name
    `);

    // Add index on materialized view
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_mv_worker_performance"
      ON "mv_worker_performance"("worker_id")
    `);

    // Create area coverage materialized view
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW "mv_area_coverage" AS
      SELECT
        a.id as area_id,
        a.name,
        a.gps_lat,
        a.gps_lng,
        at.name as area_type,
        COUNT(DISTINCT wa.worker_id) as assigned_workers,
        COUNT(DISTINCT DATE(s.clock_in_time)) as days_covered,
        COUNT(r.id) as total_reports,
        AVG(CASE
          WHEN r.condition = 'Baik' THEN 3
          WHEN r.condition = 'Cukup' THEN 2
          WHEN r.condition = 'Buruk' THEN 1
        END) as avg_condition_score
      FROM areas a
      JOIN area_types at ON a.area_type_id = at.id
      LEFT JOIN worker_assignments wa ON a.id = wa.area_id
      LEFT JOIN shifts s ON a.id = s.area_id AND s.deleted_at IS NULL
      LEFT JOIN work_reports r ON a.id = r.area_id AND r.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
      GROUP BY a.id, a.name, a.gps_lat, a.gps_lng, at.name
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_mv_area_coverage"
      ON "mv_area_coverage"("area_id")
    `);

    // Create function to refresh views (run daily via cron)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_analytics_views()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_worker_performance;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_area_coverage;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_analytics_views`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mv_area_coverage"`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS "mv_area_coverage"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mv_worker_performance"`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS "mv_worker_performance"`);
  }
}
```

#### Example 3: Add Scheduled Reports

```typescript
// 1706774400000-Phase3-AddScheduledReports.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3AddScheduledReports1706774400000 implements MigrationInterface {
  name = 'Phase3AddScheduledReports1706774400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scheduled_reports" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" UUID NOT NULL,
        "created_by" UUID,
        "name" VARCHAR(200) NOT NULL,
        "schedule_cron" VARCHAR(100) NOT NULL,
        "recipients" TEXT[] NOT NULL,
        "is_active" BOOLEAN DEFAULT TRUE,
        "last_run_at" TIMESTAMPTZ,
        "next_run_at" TIMESTAMPTZ,
        "run_count" INTEGER DEFAULT 0,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_scheduled_reports_template"
          FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_scheduled_reports_creator"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_scheduled_reports_next_run"
      ON "scheduled_reports"("next_run_at", "is_active")
      WHERE "is_active" = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_scheduled_reports_next_run"`);
    await queryRunner.query(`DROP TABLE "scheduled_reports"`);
  }
}
```

---

### Phase 4 Migration Examples

#### Example 1: Add Asset Management Tables

```typescript
// 1707984000000-Phase4-AddAssetManagement.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4AddAssetManagement1707984000000 implements MigrationInterface {
  name = 'Phase4AddAssetManagement1707984000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create asset_types table
    await queryRunner.query(`
      CREATE TABLE "asset_types" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) UNIQUE NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "requires_calibration" BOOLEAN DEFAULT FALSE,
        "calibration_interval_days" INTEGER,
        "default_warranty_months" INTEGER DEFAULT 12,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_asset_types_code"
      ON "asset_types"("code")
    `);

    // Seed asset types
    await queryRunner.query(`
      INSERT INTO "asset_types" ("code", "name", "description", "requires_calibration", "calibration_interval_days")
      VALUES
        ('mower', 'Lawn Mower', 'Gas-powered lawn mower', FALSE, NULL),
        ('trimmer', 'Grass Trimmer', 'Cordless grass trimmer', FALSE, NULL),
        ('sprayer', 'Chemical Sprayer', 'Backpack sprayer for fertilizer/pesticide', TRUE, 90),
        ('rake', 'Garden Rake', 'Metal garden rake', FALSE, NULL),
        ('cart', 'Garden Cart', 'Wheelbarrow/garden cart', FALSE, NULL),
        ('blower', 'Leaf Blower', 'Gas-powered leaf blower', FALSE, NULL),
        ('chainsaw', 'Chainsaw', 'Gas-powered chainsaw', TRUE, 180),
        ('ladder', 'Ladder', 'Extension ladder', FALSE, NULL)
    `);

    // Create assets table
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "asset_code" VARCHAR(50) UNIQUE NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "asset_type_id" UUID NOT NULL,
        "description" TEXT,
        "brand" VARCHAR(100),
        "model" VARCHAR(100),
        "serial_number" VARCHAR(100),
        "purchase_date" DATE,
        "purchase_price" DECIMAL(15, 2),
        "warranty_expiry" DATE,
        "status" VARCHAR(30) DEFAULT 'available',
        "condition" VARCHAR(20) DEFAULT 'good',
        "current_holder_id" UUID,
        "current_area_id" UUID,
        "last_maintenance_date" DATE,
        "next_maintenance_date" DATE,
        "gps_lat" DECIMAL(10, 8),
        "gps_lng" DECIMAL(11, 8),
        "photo_url" TEXT,
        "qr_code_url" TEXT,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,

        CONSTRAINT "fk_assets_type"
          FOREIGN KEY ("asset_type_id") REFERENCES "asset_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_assets_holder"
          FOREIGN KEY ("current_holder_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_assets_area"
          FOREIGN KEY ("current_area_id") REFERENCES "areas"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_asset_status"
          CHECK ("status" IN ('available', 'in_use', 'maintenance', 'retired', 'lost', 'damaged')),
        CONSTRAINT "chk_asset_condition"
          CHECK ("condition" IN ('excellent', 'good', 'fair', 'poor', 'broken')),
        CONSTRAINT "chk_asset_location"
          CHECK (
            ("current_holder_id" IS NOT NULL AND "current_area_id" IS NULL) OR
            ("current_holder_id" IS NULL AND "current_area_id" IS NOT NULL) OR
            ("current_holder_id" IS NULL AND "current_area_id" IS NULL)
          )
      )
    `);

    // Add CRITICAL indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_assets_code"
      ON "assets"("asset_code")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assets_type_status"
      ON "assets"("asset_type_id", "status")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assets_available"
      ON "assets"("status", "asset_type_id", "condition")
      WHERE "status" = 'available' AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assets_maintenance"
      ON "assets"("next_maintenance_date")
      WHERE "status" != 'retired' AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assets_maintenance"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assets_available"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assets_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assets_code"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_types_code"`);
    await queryRunner.query(`DROP TABLE "asset_types"`);
  }
}
```

#### Example 2: Add Asset Assignments and Maintenance

```typescript
// 1708070400000-Phase4-AddAssetAssignments.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4AddAssetAssignments1708070400000 implements MigrationInterface {
  name = 'Phase4AddAssetAssignments1708070400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create asset_assignments table
    await queryRunner.query(`
      CREATE TABLE "asset_assignments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "asset_id" UUID NOT NULL,
        "assigned_to" UUID NOT NULL,
        "assigned_by" UUID NOT NULL,
        "area_id" UUID,
        "assigned_at" TIMESTAMPTZ DEFAULT NOW(),
        "returned_at" TIMESTAMPTZ,
        "return_condition" VARCHAR(20),
        "return_notes" TEXT,
        "photo_assigned_url" TEXT,
        "photo_returned_url" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_asset_assignments_asset"
          FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_asset_assignments_user"
          FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_asset_assignments_assigner"
          FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_asset_assignments_area"
          FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_assignment_return"
          CHECK ("returned_at" IS NULL OR "returned_at" > "assigned_at"),
        CONSTRAINT "chk_return_condition"
          CHECK ("return_condition" IS NULL OR "return_condition" IN ('excellent', 'good', 'fair', 'poor', 'broken'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_asset_assignments_asset"
      ON "asset_assignments"("asset_id", "assigned_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_asset_assignments_active"
      ON "asset_assignments"("asset_id", "assigned_to")
      WHERE "returned_at" IS NULL
    `);

    // Create maintenance_records table
    await queryRunner.query(`
      CREATE TABLE "maintenance_records" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "asset_id" UUID NOT NULL,
        "maintenance_type" VARCHAR(50) NOT NULL,
        "description" TEXT NOT NULL,
        "performed_by" UUID,
        "vendor_name" VARCHAR(200),
        "cost" DECIMAL(15, 2),
        "scheduled_date" DATE,
        "completed_date" DATE,
        "status" VARCHAR(30) DEFAULT 'scheduled',
        "notes" TEXT,
        "photos_url" TEXT[],
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_maintenance_asset"
          FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_maintenance_performer"
          FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_maintenance_type"
          CHECK ("maintenance_type" IN ('routine', 'repair', 'calibration', 'inspection', 'replacement')),
        CONSTRAINT "chk_maintenance_status"
          CHECK ("status" IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
        CONSTRAINT "chk_maintenance_completed"
          CHECK (("status" = 'completed' AND "completed_date" IS NOT NULL) OR ("status" != 'completed'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_maintenance_records_asset"
      ON "maintenance_records"("asset_id", "completed_date" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_maintenance_records_scheduled"
      ON "maintenance_records"("scheduled_date", "status")
      WHERE "status" IN ('scheduled', 'in_progress')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_maintenance_records_scheduled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_maintenance_records_asset"`);
    await queryRunner.query(`DROP TABLE "maintenance_records"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_assignments_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_assignments_asset"`);
    await queryRunner.query(`DROP TABLE "asset_assignments"`);
  }
}
```

---

### Phase 6 Migration Examples

#### Example 1: Add Audit Logs with Partitioning

```typescript
// 1710288000000-Phase6-AddAuditLogs.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6AddAuditLogs1710288000000 implements MigrationInterface {
  name = 'Phase6AddAuditLogs1710288000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create parent partitioned table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID,
        "action" VARCHAR(50) NOT NULL,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" UUID,
        "entity_name" VARCHAR(200),
        "old_value" JSONB,
        "new_value" JSONB,
        "changed_fields" TEXT[],
        "ip_address" INET,
        "user_agent" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_audit_logs_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_audit_action"
          CHECK ("action" IN (
            'create', 'update', 'delete', 'soft_delete', 'restore',
            'login', 'logout', 'login_failed', 'password_change',
            'export', 'import', 'bulk_update', 'bulk_delete'
          )),
        PRIMARY KEY ("id", "created_at")
      ) PARTITION BY RANGE ("created_at")
    `);

    // Create partitions for current and next 3 months
    const startDate = new Date('2026-01-01');
    for (let i = 0; i < 4; i++) {
      const partitionDate = new Date(startDate);
      partitionDate.setMonth(partitionDate.getMonth() + i);
      const nextMonth = new Date(partitionDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const partitionName = `audit_logs_${partitionDate.getFullYear()}_${String(partitionDate.getMonth() + 1).padStart(2, '0')}`;

      await queryRunner.query(`
        CREATE TABLE "${partitionName}" PARTITION OF "audit_logs"
        FOR VALUES FROM ('${partitionDate.toISOString().split('T')[0]}')
        TO ('${nextMonth.toISOString().split('T')[0]}')
      `);

      // Add indexes to each partition
      await queryRunner.query(`
        CREATE INDEX "idx_${partitionName}_user"
        ON "${partitionName}"("user_id", "created_at" DESC)
      `);

      await queryRunner.query(`
        CREATE INDEX "idx_${partitionName}_entity"
        ON "${partitionName}"("entity_type", "entity_id", "created_at" DESC)
      `);

      await queryRunner.query(`
        CREATE INDEX "idx_${partitionName}_action"
        ON "${partitionName}"("action", "created_at" DESC)
      `);
    }

    // Create partition management function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_audit_logs_partition()
      RETURNS void AS $$
      DECLARE
        next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
        month_after DATE := next_month + INTERVAL '1 month';
        partition_name TEXT := 'audit_logs_' || TO_CHAR(next_month, 'YYYY_MM');
      BEGIN
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
          partition_name, next_month, month_after);

        EXECUTE format('CREATE INDEX idx_%I_user ON %I(user_id, created_at DESC)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_entity ON %I(entity_type, entity_id, created_at DESC)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_action ON %I(action, created_at DESC)', partition_name, partition_name);
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create cleanup function (drop partitions older than 2 years)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_audit_logs_partitions()
      RETURNS void AS $$
      DECLARE
        partition_record RECORD;
        cutoff_date DATE := DATE_TRUNC('month', NOW() - INTERVAL '2 years');
      BEGIN
        FOR partition_record IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename LIKE 'audit_logs_%'
            AND tablename != 'audit_logs'
        LOOP
          DECLARE
            partition_date DATE;
          BEGIN
            partition_date := TO_DATE(SUBSTRING(partition_record.tablename FROM 'audit_logs_(.*)'), 'YYYY_MM');
            IF partition_date < cutoff_date THEN
              EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
              RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error processing partition %: %', partition_record.tablename, SQLERRM;
          END;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS cleanup_old_audit_logs_partitions`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS create_audit_logs_partition`);

    // Drop all partitions
    const partitions = await queryRunner.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'audit_logs_%'
    `);

    for (const partition of partitions) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${partition.tablename}"`);
    }

    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
```

#### Example 2: Add System Settings and Bulk Operations

```typescript
// 1710374400000-Phase6-AddSystemSettings.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6AddSystemSettings1710374400000 implements MigrationInterface {
  name = 'Phase6AddSystemSettings1710374400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create system_settings table
    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "key" VARCHAR(100) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "value_type" VARCHAR(20) DEFAULT 'string',
        "description" TEXT,
        "category" VARCHAR(50) DEFAULT 'general',
        "is_public" BOOLEAN DEFAULT FALSE,
        "updated_by" UUID,
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT "fk_system_settings_updater"
          FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_value_type"
          CHECK ("value_type" IN ('string', 'number', 'boolean', 'json'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_system_settings_category"
      ON "system_settings"("category")
    `);

    // Insert default settings
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "value_type", "description", "category", "is_public")
      VALUES
        ('shift_reminder_time', '07:00', 'string', 'Time to send shift reminder notifications (HH:MM)', 'notifications', TRUE),
        ('max_shift_hours', '12', 'number', 'Maximum allowed shift duration in hours', 'shifts', TRUE),
        ('location_ping_interval', '300', 'number', 'GPS ping interval in seconds', 'location', TRUE),
        ('report_photo_required', 'true', 'boolean', 'Require photo for work reports', 'reports', TRUE),
        ('gps_tolerance_meters', '100', 'number', 'GPS validation tolerance in meters', 'location', TRUE),
        ('maintenance_notice_days', '7', 'number', 'Days before maintenance due to send notice', 'assets', FALSE),
        ('auto_logout_minutes', '480', 'number', 'Auto logout after inactivity (minutes)', 'security', TRUE),
        ('backup_retention_days', '90', 'number', 'Days to retain database backups', 'system', FALSE),
        ('max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB', 'system', TRUE)
    `);

    // Create bulk_operations table
    await queryRunner.query(`
      CREATE TABLE "bulk_operations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "operation_type" VARCHAR(50) NOT NULL,
        "entity_type" VARCHAR(50) NOT NULL,
        "performed_by" UUID,
        "affected_count" INTEGER DEFAULT 0,
        "parameters" JSONB NOT NULL,
        "entity_ids" UUID[],
        "status" VARCHAR(30) DEFAULT 'pending',
        "error_message" TEXT,
        "started_at" TIMESTAMPTZ DEFAULT NOW(),
        "completed_at" TIMESTAMPTZ,

        CONSTRAINT "fk_bulk_operations_user"
          FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "chk_bulk_operation_type"
          CHECK ("operation_type" IN ('bulk_update', 'bulk_delete', 'bulk_import', 'bulk_export', 'bulk_assign')),
        CONSTRAINT "chk_bulk_status"
          CHECK ("status" IN ('pending', 'in_progress', 'completed', 'failed', 'partial'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_bulk_operations_user"
      ON "bulk_operations"("performed_by", "started_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_bulk_operations_status"
      ON "bulk_operations"("status", "started_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bulk_operations_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bulk_operations_user"`);
    await queryRunner.query(`DROP TABLE "bulk_operations"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_system_settings_category"`);
    await queryRunner.query(`DROP TABLE "system_settings"`);
  }
}
```

---

## Troubleshooting

### Migration Failed Mid-Execution

**Problem:** Migration crashed, database in inconsistent state

**Solution:**
```bash
# 1. Check migration status
npm run typeorm:show

# 2. Manually inspect database
psql -U postgres -d sekar_db
SELECT * FROM migrations ORDER BY timestamp DESC;

# 3. If migration partially applied, manually fix
# Example: Table created but index failed
CREATE INDEX idx_users_email ON users(email);

# 4. Manually insert migration record
INSERT INTO migrations (timestamp, name)
VALUES (1704441600000, 'AddEmailToUsers1704441600000');

# 5. Or manually revert changes and run again
DROP TABLE new_table;
npm run typeorm:run
```

### Migration Already Exists Error

**Problem:** TypeORM thinks migration already ran but schema is wrong

**Solution:**
```bash
# 1. Check migrations table
psql -U postgres -d sekar_db
SELECT * FROM migrations;

# 2. Remove entry if migration didn't actually complete
DELETE FROM migrations WHERE timestamp = 1704441600000;

# 3. Run migration again
npm run typeorm:run
```

### Entity Out of Sync with Database

**Problem:** Entity definitions don't match database schema

**Solution:**
```bash
# 1. Generate migration to sync
npm run typeorm:generate -- src/database/migrations/SyncSchema

# 2. Review generated SQL carefully
cat src/database/migrations/*-SyncSchema.ts

# 3. Run migration
npm run typeorm:run
```

### Cannot Revert Migration

**Problem:** Down migration is missing or incorrect

**Solution:**
```bash
# 1. Manually write SQL to revert changes
psql -U postgres -d sekar_db

# 2. Run reverse SQL manually
ALTER TABLE users DROP COLUMN email;

# 3. Remove migration entry
DELETE FROM migrations WHERE timestamp = 1704441600000;

# 4. Fix migration file for future
# Add proper down() implementation
```

---

## NPM Scripts

Add these to `apps/be/package.json`:

```json
{
  "scripts": {
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "typeorm:show": "npm run typeorm -- -d src/database/typeorm.config.ts migration:show",
    "typeorm:run": "npm run typeorm -- -d src/database/typeorm.config.ts migration:run",
    "typeorm:revert": "npm run typeorm -- -d src/database/typeorm.config.ts migration:revert",
    "typeorm:generate": "npm run typeorm -- -d src/database/typeorm.config.ts migration:generate",
    "typeorm:create": "npm run typeorm -- -d src/database/typeorm.config.ts migration:create"
  }
}
```

---

## Migration Checklist

### Before Creating Migration
- [ ] Entity changes committed to Git
- [ ] Local database in sync with entities
- [ ] Test data backed up

### Creating Migration
- [ ] Use descriptive name with action verb
- [ ] Generate from entities OR write manually
- [ ] Review generated SQL carefully
- [ ] Include proper down() migration

### Testing Migration
- [ ] Run migration in development
- [ ] Test application functionality
- [ ] Revert migration successfully
- [ ] Re-apply migration successfully
- [ ] Check database schema matches expectations

### Before Deploying
- [ ] Migration committed to Git
- [ ] Code review completed
- [ ] Tested in staging environment
- [ ] Production database backed up
- [ ] Rollback plan documented

### After Deploying
- [ ] Migration ran successfully
- [ ] Application restarted
- [ ] Functionality tested
- [ ] Monitor logs for errors
- [ ] Document any issues

---

---

## Phase 2E Migration: Client Feedback II (Planned)

> **Full SQL + Rollback:** See [`specs/phases/phase-2-e-client-feedback-2/database.md`](../phases/phase-2-e-client-feedback-2/database.md)

### Migration: Phase2EClientFeedback

**Single atomic migration** covering all Phase 2E schema changes:

| Operation | Table | Change |
|-----------|-------|--------|
| ALTER | `users` | ADD `phone_number` VARCHAR(20), ADD `profile_picture_url` TEXT |
| CREATE INDEX | `users` | UNIQUE partial index on `phone_number` WHERE NOT NULL |
| CREATE TABLE | `user_areas` | Junction table (user_id, area_id, assignment_type, assigned_by) |
| ALTER | `shifts` | ADD `is_overtime` BOOLEAN DEFAULT false |
| ALTER | `overtimes` | ADD `shift_id` UUID FK→shifts |
| ALTER | `user_tracking_status` | ADD `rayon_id` UUID FK→rayons |
| CREATE TABLE | `audit_logs` | Audit trail (entity_type, entity_id, action, actor_id, old/new JSONB) |
| CREATE INDEX | Multiple | 8 new indexes (see database.md for details) |

**Rollback:** Full reverse SQL provided in database.md (DROP tables + columns).

**Notes:**
- Uses `CREATE INDEX CONCURRENTLY` for indexes on existing large tables (overtimes, user_tracking_status)
- `audit_logs.actor_id` uses `ON DELETE RESTRICT` (immutable audit records)
- `user_areas` has composite unique constraint `(user_id, area_id, assignment_type)`
- OvertimeStatus enum needs `IN_PROGRESS` value added

---

**Last Updated:** 2026-03-10
**Migration Strategy Version:** 2.1
**TypeORM Version:** 0.3.x
**Status:** Phase 1 Migrations Complete | Phase 2D Deployed | Phase 2E Planned
