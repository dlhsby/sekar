import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalize existing `users.phone_number` values to the local `08…` format the
 * app now standardizes on (DTOs + login both normalize going forward). Without
 * this, rows stored as `+62…`/`62…`/`8…`/spaced from the old `^(\+62|0)…` rule
 * would no longer match phone-login (which now normalizes the input to `08…`).
 *
 * Idempotent: after normalization every value starts with `0`, so re-running is
 * a no-op. Irreversible (original spellings aren't recoverable) — `down` is a
 * no-op by design.
 */
export class NormalizePhoneNumbers17490700000000 implements MigrationInterface {
  name = 'NormalizePhoneNumbers17490700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Strip spaces / dashes / dots / parentheses.
    await queryRunner.query(
      `UPDATE "users" SET "phone_number" = regexp_replace("phone_number", '[\\s().-]', '', 'g')
       WHERE "phone_number" ~ '[\\s().-]'`,
    );
    // 2. +62xxxx → 0xxxx
    await queryRunner.query(
      `UPDATE "users" SET "phone_number" = '0' || substring("phone_number" from 4)
       WHERE "phone_number" LIKE '+62%'`,
    );
    // 3. 62xxxx → 0xxxx
    await queryRunner.query(
      `UPDATE "users" SET "phone_number" = '0' || substring("phone_number" from 3)
       WHERE "phone_number" LIKE '62%'`,
    );
    // 4. 8xxxx → 08xxxx (bare national number)
    await queryRunner.query(
      `UPDATE "users" SET "phone_number" = '0' || "phone_number"
       WHERE "phone_number" LIKE '8%'`,
    );
  }

  public async down(): Promise<void> {
    // Data normalization — original formats are not recoverable. No-op.
  }
}
