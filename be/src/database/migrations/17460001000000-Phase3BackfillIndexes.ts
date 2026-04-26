import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3BackfillIndexes17460001000000 implements MigrationInterface {
  name = 'Phase3BackfillIndexes17460001000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // CONCURRENTLY cannot run inside a transaction; TypeORM wraps each migration
    // in a transaction by default. We need to break out of the transaction.
    await queryRunner.query(`COMMIT`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_user_logged ON location_logs (user_id, logged_at DESC)`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_shift_logged ON location_logs (shift_id, logged_at)`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_user_shift_logged ON location_logs (user_id, shift_id, logged_at)`);
    await queryRunner.query(`BEGIN`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`COMMIT`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_location_logs_user_shift_logged`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_location_logs_shift_logged`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_location_logs_user_logged`);
    await queryRunner.query(`BEGIN`);
  }
}
