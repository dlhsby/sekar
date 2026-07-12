import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename Location → Location across all tables and columns
 *
 * Renames:
 * - Table: areas → locations
 * - Table: area_types → location_types
 * - Table: area_staff_requirements → location_staff_requirements
 * - Table: user_areas → user_locations
 * - Table: schedule_areas → schedule_locations
 * - Table: area_plants → location_plants
 * - Column: area_id → location_id (in 6 tables)
 * - Column: area_type_id → location_type_id (in areas/locations)
 *
 * Backward Compatibility: Mobile client continues using old routes via
 * controller array paths: @Controller(['locations', 'areas'])
 */
export class RenameAreaToLocation17492300000000 implements MigrationInterface {
  name = 'RenameAreaToLocation17492300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Step 1: Rename area_types table ──
    await queryRunner.query(`ALTER TABLE "area_types" RENAME TO "location_types"`);

    // ── Step 2: Rename areas → locations ──
    await queryRunner.query(`ALTER TABLE "areas" RENAME TO "locations"`);

    // Rename column: area_type_id → location_type_id in locations
    await queryRunner.query(
      `ALTER TABLE "locations" RENAME COLUMN "area_type_id" TO "location_type_id"`,
    );

    // ── Step 3: Rename area_staff_requirements table and columns ──
    await queryRunner.query(
      `ALTER TABLE "area_staff_requirements" RENAME TO "location_staff_requirements"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" RENAME COLUMN "area_id" TO "location_id"`,
    );

    // ── Step 4: Rename user_areas table and columns ──
    await queryRunner.query(`ALTER TABLE "user_areas" RENAME TO "user_locations"`);
    await queryRunner.query(
      `ALTER TABLE "user_locations" RENAME COLUMN "area_id" TO "location_id"`,
    );

    // ── Step 5: Rename schedule_areas table and columns ──
    await queryRunner.query(`ALTER TABLE "schedule_areas" RENAME TO "schedule_locations"`);
    await queryRunner.query(
      `ALTER TABLE "schedule_locations" RENAME COLUMN "area_id" TO "location_id"`,
    );

    // ── Step 6: Rename area_plants table and columns ──
    await queryRunner.query(`ALTER TABLE "area_plants" RENAME TO "location_plants"`);
    await queryRunner.query(
      `ALTER TABLE "location_plants" RENAME COLUMN "area_id" TO "location_id"`,
    );

    // ── Step 7: Rename area_id columns in tables with FK to areas/locations ──
    // users table
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "area_id" TO "location_id"`);

    // overtime table
    await queryRunner.query(`ALTER TABLE "overtimes" RENAME COLUMN "area_id" TO "location_id"`);

    // user_tracking_status table
    await queryRunner.query(
      `ALTER TABLE "user_tracking_status" RENAME COLUMN "area_id" TO "location_id"`,
    );

    // assets table
    await queryRunner.query(`ALTER TABLE "assets" RENAME COLUMN "area_id" TO "location_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Reverse Step 7: Rename location_id columns back to area_id ──
    // assets table
    await queryRunner.query(`ALTER TABLE "assets" RENAME COLUMN "location_id" TO "area_id"`);

    // user_tracking_status table
    await queryRunner.query(
      `ALTER TABLE "user_tracking_status" RENAME COLUMN "location_id" TO "area_id"`,
    );

    // overtime table
    await queryRunner.query(`ALTER TABLE "overtimes" RENAME COLUMN "location_id" TO "area_id"`);

    // users table
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "location_id" TO "area_id"`);

    // ── Reverse Step 6: Rename location_plants → area_plants ──
    await queryRunner.query(
      `ALTER TABLE "location_plants" RENAME COLUMN "location_id" TO "area_id"`,
    );
    await queryRunner.query(`ALTER TABLE "location_plants" RENAME TO "area_plants"`);

    // ── Reverse Step 5: Rename schedule_locations → schedule_areas ──
    await queryRunner.query(
      `ALTER TABLE "schedule_locations" RENAME COLUMN "location_id" TO "area_id"`,
    );
    await queryRunner.query(`ALTER TABLE "schedule_locations" RENAME TO "schedule_areas"`);

    // ── Reverse Step 4: Rename user_locations → user_areas ──
    await queryRunner.query(
      `ALTER TABLE "user_locations" RENAME COLUMN "location_id" TO "area_id"`,
    );
    await queryRunner.query(`ALTER TABLE "user_locations" RENAME TO "user_areas"`);

    // ── Reverse Step 3: Rename location_staff_requirements → area_staff_requirements ──
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" RENAME COLUMN "location_id" TO "area_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" RENAME TO "area_staff_requirements"`,
    );

    // ── Reverse Step 2: Rename locations → areas ──
    await queryRunner.query(
      `ALTER TABLE "locations" RENAME COLUMN "location_type_id" TO "area_type_id"`,
    );
    await queryRunner.query(`ALTER TABLE "locations" RENAME TO "areas"`);

    // ── Reverse Step 1: Rename location_types → area_types ──
    await queryRunner.query(`ALTER TABLE "location_types" RENAME TO "area_types"`);
  }
}
