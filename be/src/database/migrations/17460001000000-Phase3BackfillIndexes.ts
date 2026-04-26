import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3BackfillIndexes17460001000000 implements MigrationInterface {
  name = 'Phase3BackfillIndexes17460001000000';
  public transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_user_logged ON location_logs (user_id, logged_at DESC)`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_shift_logged ON location_logs (shift_id, logged_at)`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_user_shift_logged ON location_logs (user_id, shift_id, logged_at)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_location_logs_user_shift_logged`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_location_logs_shift_logged`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_location_logs_user_logged`);
  }
}
