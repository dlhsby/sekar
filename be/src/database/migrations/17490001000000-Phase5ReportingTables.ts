import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5ReportingTables17490001000000 implements MigrationInterface {
  name = 'Phase5ReportingTables17490001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create report_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "report_type" varchar(50) NOT NULL,
        "template_config" jsonb,
        "is_system" boolean DEFAULT false,
        "created_by" uuid,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_templates_slug" ON "report_templates"("slug")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_templates_report_type" ON "report_templates"("report_type")`);

    // Create generated_reports table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "generated_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "report_templates"("id"),
        "generated_by" uuid,
        "schedule_id" uuid,
        "title" varchar(200) NOT NULL,
        "report_type" varchar(50) NOT NULL,
        "format" varchar(20) NOT NULL,
        "status" varchar(20) DEFAULT 'processing',
        "file_url" text,
        "file_size_bytes" bigint,
        "parameters" jsonb,
        "error_message" text,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_generated_reports_generated_by_created_at" ON "generated_reports"("generated_by", "created_at" DESC)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_generated_reports_template_id_created_at" ON "generated_reports"("template_id", "created_at" DESC)`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_generated_reports_status" ON "generated_reports"("status")`);

    // Create report_schedules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_schedules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "report_templates"("id"),
        "name" varchar(100) NOT NULL,
        "frequency" varchar(20) NOT NULL,
        "cron_expression" varchar(255) NOT NULL,
        "timezone" varchar(50) DEFAULT 'Asia/Jakarta',
        "parameters" jsonb,
        "is_active" boolean DEFAULT true,
        "last_run_at" timestamptz,
        "next_run_at" timestamptz,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_schedules_is_active_next_run_at" ON "report_schedules"("is_active", "next_run_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_schedules_template_id" ON "report_schedules"("template_id")`);

    // Seed system report templates
    await queryRunner.query(`
      INSERT INTO "report_templates" (name, slug, description, report_type, is_system, created_at, updated_at)
      VALUES
        ('Laporan Operasional Harian', 'daily-operations', 'Daily operations summary with attendance, tasks, and activities', 'daily_operations', true, NOW(), NOW()),
        ('Laporan Kinerja Mingguan', 'weekly-performance', 'Weekly performance analysis with trends and rankings', 'weekly_performance', true, NOW(), NOW()),
        ('Ringkasan Laporan Bulanan', 'monthly-summary', 'Monthly summary with KPIs and analysis', 'monthly_summary', true, NOW(), NOW()),
        ('Laporan Kinerja Pekerja', 'worker-performance', 'Individual worker performance report', 'worker_performance', true, NOW(), NOW()),
        ('Laporan Status Area', 'area-status', 'Area-specific status report with staffing and tasks', 'area_status', true, NOW(), NOW()),
        ('Laporan Utilisasi Lembur', 'overtime-utilization', 'Overtime usage and cost analysis', 'overtime_utilization', true, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "report_schedules"`);
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "generated_reports"`);
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "report_templates"`);
  }
}
