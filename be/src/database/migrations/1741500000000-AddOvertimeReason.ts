import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOvertimeReason1741500000000 implements MigrationInterface {
  name = 'AddOvertimeReason1741500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS reason TEXT;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE overtimes DROP COLUMN IF EXISTS reason;
    `);
  }
}
