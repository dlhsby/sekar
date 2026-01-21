# Database Migration Strategy

## Overview

This document outlines the database migration strategy for SEKAR using TypeORM. It covers migration creation, execution, rollback procedures, and best practices for managing schema changes.

**Migration Tool:** TypeORM CLI
**Node Version:** 18+
**TypeScript Version:** 5.x
**Current Strategy:** Auto-synchronize in development, migrations in production

---

## Migration Philosophy

### Development vs Production

**Development Environment:**
- Use TypeORM's `synchronize: true` for rapid iteration
- Schema changes applied automatically on application start
- No migration files needed during development
- Faster development cycle, less overhead

**Production Environment:**
- **NEVER** use `synchronize: true` in production
- Always use explicit migration files
- Version controlled schema changes
- Rollback capability for failed deployments

### Why This Approach?

1. **Speed in Development** - Developers can iterate quickly without creating migrations
2. **Safety in Production** - Explicit migrations prevent accidental schema changes
3. **Version Control** - Migration files are code reviewed before deployment
4. **Rollback** - Failed migrations can be reverted with down migrations
5. **Audit Trail** - Clear history of all schema changes

---

## TypeORM Configuration

### Development Configuration

```typescript
// be/src/database/typeorm.config.ts (development)
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
// be/src/database/typeorm.config.ts (production)
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
be/
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
be/src/database/migrations/
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

Add these to `be/package.json`:

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

**Last Updated:** 2026-01-16
**Migration Strategy Version:** 1.0
**TypeORM Version:** 0.3.x
