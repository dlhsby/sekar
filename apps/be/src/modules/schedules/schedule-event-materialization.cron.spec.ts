/**
 * Unit tests: ScheduleEventMaterializationCron — the SHAPE of its query.
 *
 * This is the F10 hazard from the staging cutover runbook: a bare `relations`
 * array loads EVERY column of each joined entity, including
 * `locations.boundary_polygon`. The runbook records F10 as fixed for
 * /schedules/range (explicit column lists, polygons fetched per-subject by the
 * map modal) — but the materializer was a second, unfixed instance of the same
 * bug, found on 2026-09-02 while diagnosing an OOM on the staging box.
 *
 * These assert the query shape rather than the output, because that is where
 * the defect lives: the materializer's results were always correct, it just
 * dragged megabytes of geometry through the heap to read two `district_id`
 * values.
 */

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduleEventMaterializationCron } from './schedule-event-materialization.cron';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';

describe('ScheduleEventMaterializationCron — query shape (F10)', () => {
  let cron: ScheduleEventMaterializationCron;
  let find: jest.Mock;

  beforeEach(async () => {
    find = jest.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduleEventMaterializationCron,
        { provide: getRepositoryToken(ScheduleEvent), useValue: { find } },
        {
          provide: ScheduleMaterializerService,
          useValue: {
            materializeEventForDate: jest.fn().mockResolvedValue({ created: 0, skipped: 0 }),
          },
        },
      ],
    }).compile();
    cron = moduleRef.get(ScheduleEventMaterializationCron);
  });

  const findArgs = () => find.mock.calls[0]?.[0] ?? {};

  /** `relations` may be an array or the object form; normalise to a name list. */
  const relationNames = (rel: unknown): string[] =>
    Array.isArray(rel) ? rel : rel && typeof rel === 'object' ? Object.keys(rel) : [];

  it('does not select boundary_polygon on the joined location', async () => {
    await cron.onDailyMaterialization();
    const { select } = findArgs();
    // A relation must be column-restricted, or TypeORM returns every column —
    // 837 kB of geometry across 955 locations, to read one district_id.
    expect(select?.location).toBeDefined();
    expect(select.location.boundary_polygon).not.toBe(true);
    expect(select.location.district_id).toBe(true);
  });

  it('does not select boundary_polygon on the joined region', async () => {
    await cron.onDailyMaterialization();
    const { select } = findArgs();
    expect(select?.region).toBeDefined();
    expect(select.region.boundary_polygon).not.toBe(true);
    expect(select.region.district_id).toBe(true);
  });

  it('does not join relations whose scalar id is already on the event row', async () => {
    // team_category / pic_user / user were joined, but only event.team_category_id,
    // event.pic_user_id and event.user_id are ever read — the ids live on the
    // event itself, so the joins bought nothing and cost three extra tables.
    await cron.onDailyMaterialization();
    const names = relationNames(findArgs().relations);
    expect(names).not.toContain('team_category');
    expect(names).not.toContain('pic_user');
    expect(names).not.toContain('user');
  });

  it('still joins what the materializer actually dereferences', async () => {
    await cron.onDailyMaterialization();
    const names = relationNames(findArgs().relations);
    // shift_definition.name is read; members is iterated; location/region carry district_id.
    expect(names).toEqual(
      expect.arrayContaining(['shift_definition', 'location', 'region', 'members']),
    );
  });

  it('keeps filtering on the shift being active', async () => {
    // Guard against the narrowing losing the WHERE: a retired shift must stop
    // producing roster rows.
    await cron.onDailyMaterialization();
    const { where } = findArgs();
    expect(where.is_active).toBe(true);
    expect(where.shift_definition).toEqual({ is_active: true });
  });
});
