import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2EClientFeedback1741200000000 implements MigrationInterface {
  name = 'Phase2EClientFeedback1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Alter users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number
      ON users (phone_number) WHERE phone_number IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT
    `);

    // 2. Create user_areas junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        assignment_type VARCHAR(20) NOT NULL DEFAULT 'permanent',
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_area UNIQUE (user_id, location_id, assignment_type),
        CONSTRAINT chk_user_areas_assignment_type CHECK (assignment_type IN ('permanent', 'task_based'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_areas_user_type ON user_areas (user_id, assignment_type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_areas_area ON user_areas (location_id)
    `);

    // 3. Alter shifts table
    await queryRunner.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_is_overtime ON shifts (is_overtime) WHERE is_overtime = true
    `);

    // 4. Alter overtimes table
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_overtimes_shift ON overtimes (shift_id) WHERE shift_id IS NOT NULL
    `);
    // Make end_datetime nullable for in-progress overtime
    await queryRunner.query(`
      ALTER TABLE overtimes ALTER COLUMN end_datetime DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ALTER COLUMN end_datetime DROP DEFAULT
    `);
    // Make activity_type_id nullable (set on end, not start)
    await queryRunner.query(`
      ALTER TABLE overtimes ALTER COLUMN activity_type_id DROP NOT NULL
    `);
    // Make description nullable (set on end, not start)
    await queryRunner.query(`
      ALTER TABLE overtimes ALTER COLUMN description DROP NOT NULL
    `);

    // 5. Alter user_tracking_status table
    await queryRunner.query(`
      ALTER TABLE user_tracking_status ADD COLUMN IF NOT EXISTS rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tracking_rayon ON user_tracking_status (rayon_id) WHERE rayon_id IS NOT NULL
    `);

    // 6. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        old_value JSONB,
        new_value JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (entity_type, action)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse all Phase 2E changes
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_tracking_rayon`);
    await queryRunner.query(`ALTER TABLE user_tracking_status DROP COLUMN IF EXISTS rayon_id`);

    await queryRunner.query(`ALTER TABLE overtimes ALTER COLUMN description SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE overtimes ALTER COLUMN activity_type_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE overtimes ALTER COLUMN end_datetime SET DEFAULT NOW()`);
    await queryRunner.query(`ALTER TABLE overtimes ALTER COLUMN end_datetime SET NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_overtimes_shift`);
    await queryRunner.query(`ALTER TABLE overtimes DROP COLUMN IF EXISTS shift_id`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_is_overtime`);
    await queryRunner.query(`ALTER TABLE shifts DROP COLUMN IF EXISTS is_overtime`);

    await queryRunner.query(`DROP TABLE IF EXISTS user_areas`);

    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS profile_picture_url`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_phone_number`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS phone_number`);
  }
}
