import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `marker_icon` (curated glyph name, e.g. "droplets") to team_categories so a
 * team's map bubble can carry a glyph, matching rayon/kawasan/lokasi/role markers
 * (the team marker editor, 2026-07-19). Colour already existed (`marker_color`).
 *
 * Idempotent: guarded so a partial/rerun is safe.
 */
export class AddTeamCategoryMarkerIcon17509000000000 implements MigrationInterface {
  name = 'AddTeamCategoryMarkerIcon17509000000000';

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return rows?.length > 0;
  }

  public async up(qr: QueryRunner): Promise<void> {
    if (!(await this.columnExists(qr, 'team_categories', 'marker_icon'))) {
      await qr.query(`ALTER TABLE "team_categories" ADD COLUMN "marker_icon" varchar(50)`);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    if (await this.columnExists(qr, 'team_categories', 'marker_icon')) {
      await qr.query(`ALTER TABLE "team_categories" DROP COLUMN "marker_icon"`);
    }
  }
}
