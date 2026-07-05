import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Days a soft-deleted user is kept before hard purge (spec backend.md §I2) */
export const SOFT_DELETE_RETENTION_DAYS = 180;

/**
 * Soft-delete cleanup cron (Phase 4-6 B2/I2).
 *
 * Weekly (Sunday 03:00 WIB) hard-purge of users soft-deleted more than 180
 * days ago, including their dependent rows (user_areas, schedules, shifts —
 * which cascades location_logs — and activities).
 *
 * DESTRUCTIVE: disabled unless ENABLE_HARD_PURGE=true. Each user purges in
 * its own transaction; a user still referenced elsewhere (tasks, audit trail)
 * fails its FK constraint, rolls back alone, and is logged as skipped.
 */
@Injectable()
export class SoftDeletePurgeCron {
  private readonly logger = new Logger(SoftDeletePurgeCron.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 3 * * 0', { name: 'soft-delete-purge', timeZone: 'Asia/Jakarta' })
  async purgeSoftDeletedUsers(): Promise<void> {
    if (process.env.ENABLE_HARD_PURGE !== 'true') {
      this.logger.debug('Soft-delete purge skipped (ENABLE_HARD_PURGE != true)');
      return;
    }

    try {
      const cutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const candidates: { id: string }[] = await this.dataSource.query(
        `SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
        [cutoff.toISOString()],
      );

      let purged = 0;
      let skipped = 0;
      for (const { id } of candidates) {
        const ok = await this.purgeUser(id);
        if (ok) purged += 1;
        else skipped += 1;
      }

      this.logger.log(
        `Soft-delete purge: ${purged} user(s) permanently deleted (>${SOFT_DELETE_RETENTION_DAYS}d), ${skipped} skipped (still referenced)`,
      );
    } catch (error) {
      this.logger.error(`Soft-delete purge failed: ${error.message}`, error.stack);
    }
  }

  /** Purge one user + dependents in a transaction; false when rolled back */
  private async purgeUser(userId: string): Promise<boolean> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(`DELETE FROM user_areas WHERE user_id = $1`, [userId]);
        await manager.query(`DELETE FROM location_logs WHERE user_id = $1`, [userId]);
        await manager.query(`DELETE FROM activities WHERE user_id = $1`, [userId]);
        // shifts delete cascades any remaining location_logs via FK
        await manager.query(`DELETE FROM shifts WHERE user_id = $1`, [userId]);
        // schedules (the roster) cascade-delete via its user_id FK on the
        // users delete below — no explicit purge needed.
        await manager.query(`DELETE FROM users WHERE id = $1`, [userId]);
      });
      return true;
    } catch (error) {
      this.logger.warn(`Purge skipped for user ${userId}: ${error.message}`);
      return false;
    }
  }
}
