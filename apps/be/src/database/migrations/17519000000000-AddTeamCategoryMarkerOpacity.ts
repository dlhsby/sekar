import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `team_categories.marker_opacity` — the alpha for the category's one colour.
 *
 * The geography tiers (district / kawasan / lokasi) carry a border/fill colour
 * PAIR, each with its own opacity (ADR-045). A team category has no boundary to
 * draw, so it has never needed a border — just the single `marker_color` its
 * pins and chips are tinted with. It was the one styled entity with no opacity
 * control at all, which made its "Penanda" column the odd one out: a hard square
 * of colour beside the geography grids' swatch + `#hex · N%` readout.
 *
 * Nullable rather than `DEFAULT 1`: null means "never set", which renders opaque
 * exactly as it did before this column existed, so no row changes appearance on
 * deploy.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class AddTeamCategoryMarkerOpacity17519000000000 implements MigrationInterface {
  name = 'AddTeamCategoryMarkerOpacity17519000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE team_categories ADD COLUMN IF NOT EXISTS marker_opacity real NULL`,
    );
    // Guard the range at the DB, not only in the DTO — the column is read by the
    // map layers, and an out-of-range alpha renders as an invisible or clipped pin.
    await queryRunner.query(`
      ALTER TABLE team_categories
        ADD CONSTRAINT chk_team_categories_marker_opacity
        CHECK (marker_opacity IS NULL OR (marker_opacity >= 0 AND marker_opacity <= 1))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE team_categories DROP CONSTRAINT IF EXISTS chk_team_categories_marker_opacity`,
    );
    await queryRunner.query(`ALTER TABLE team_categories DROP COLUMN IF EXISTS marker_opacity`);
  }
}
