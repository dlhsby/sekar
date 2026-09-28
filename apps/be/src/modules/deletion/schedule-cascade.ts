import { EntityManager, In } from 'typeorm';
import { ScheduleEvent } from '../schedules/entities/schedule-event.entity';

/**
 * A place/person/shift condition on `schedules` and `schedule_events`, as SQL
 * fragments using `$1` for the target id (the same id for both tables).
 */
export interface ScheduleTarget {
  rows: string;
  events: string;
}

export interface CancelResult {
  /** Future roster rows soft-deleted. */
  rows: number;
  /** Recurring series cut at today (their past occurrences stay). */
  seriesEnded: number;
  /** Series that had not started yet — removed entirely. */
  seriesRemoved: number;
}

/**
 * Cancels the FUTURE of a schedule target inside a force delete (ADR-062).
 *
 * "Future" = tomorrow onward in Jakarta time. Today's rows are kept — the
 * worker may already be on shift, and past/today attendance is history that a
 * delete must never rewrite. Series are ENDED at today rather than deleted, so
 * their materialised past occurrences keep pointing at a real event.
 */
export class ScheduleCascade {
  constructor(
    private readonly manager: EntityManager,
    private readonly today: string,
    private readonly actorId: string | null,
  ) {}

  async countFutureRows(target: ScheduleTarget, id: string): Promise<number> {
    return this.count(
      `SELECT COUNT(*)::int AS n FROM schedules
        WHERE deleted_at IS NULL AND schedule_date > $2 AND (${target.rows})`,
      [id, this.today],
    );
  }

  async countLiveSeries(target: ScheduleTarget, id: string): Promise<number> {
    return this.count(
      `SELECT COUNT(*)::int AS n FROM schedule_events
        WHERE deleted_at IS NULL AND (end_date IS NULL OR end_date > $2) AND (${target.events})`,
      [id, this.today],
    );
  }

  async cancel(target: ScheduleTarget, id: string): Promise<CancelResult> {
    const events = await this.liveSeries(target, id);
    let seriesEnded = 0;
    let seriesRemoved = 0;
    for (const event of events) {
      if (event.start_date > this.today) {
        await this.manager.softRemove(ScheduleEvent, { ...event, deleted_by: this.actorId });
        seriesRemoved += 1;
      } else {
        await this.manager.save(ScheduleEvent, {
          ...event,
          end_date: this.today,
          updated_by: this.actorId,
        });
        seriesEnded += 1;
      }
    }

    const eventIds = events.map((e) => e.id);
    const rows = (await this.manager.query(
      `UPDATE schedules SET deleted_at = now(), deleted_by = $3
        WHERE deleted_at IS NULL AND schedule_date > $2
          AND ((${target.rows}) OR schedule_event_id = ANY($4::uuid[]))`,
      [id, this.today, this.actorId, eventIds],
    )) as [unknown, number];

    return { rows: rows[1] ?? 0, seriesEnded, seriesRemoved };
  }

  private async liveSeries(target: ScheduleTarget, id: string): Promise<ScheduleEvent[]> {
    const ids = (await this.manager.query(
      `SELECT id FROM schedule_events
        WHERE deleted_at IS NULL AND (end_date IS NULL OR end_date > $2) AND (${target.events})`,
      [id, this.today],
    )) as Array<{ id: string }>;
    if (ids.length === 0) return [];
    return this.manager.find(ScheduleEvent, { where: { id: In(ids.map((r) => r.id)) } });
  }

  private async count(sql: string, params: unknown[]): Promise<number> {
    const [row] = (await this.manager.query(sql, params)) as Array<{ n: number }>;
    return row?.n ?? 0;
  }
}
