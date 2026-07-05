import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widen app_releases.platform from varchar(10) to varchar(20) so the new
 * `android_x86` distribution target (11 chars) fits. ARM phones keep using
 * `android`; the /android_x86 page + emulator builds use `android_x86`.
 */
export class WidenAppReleasePlatform17490200000000 implements MigrationInterface {
  name = 'WidenAppReleasePlatform17490200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_releases" ALTER COLUMN "platform" TYPE varchar(20)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safe only if no value exceeds 10 chars (e.g. no android_x86 rows remain).
    await queryRunner.query(`ALTER TABLE "app_releases" ALTER COLUMN "platform" TYPE varchar(10)`);
  }
}
