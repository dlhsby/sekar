import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyPhoneColumn1741300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Copy any phone values not yet in phone_number (legacy data safety net)
    await queryRunner.query(`
      UPDATE users
      SET phone_number = phone
      WHERE phone IS NOT NULL
        AND phone != ''
        AND (phone_number IS NULL OR phone_number = '')
    `);

    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS phone`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);

    // Restore phone from phone_number
    await queryRunner.query(`UPDATE users SET phone = phone_number WHERE phone_number IS NOT NULL`);
  }
}
