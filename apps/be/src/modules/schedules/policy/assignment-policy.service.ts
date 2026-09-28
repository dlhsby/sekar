import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ApiException } from '../../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../../common/enums/api-error-codes.enum';
import { schedulePlaceKey } from '../schedules.support';
import {
  evaluateAssignment,
  type ExistingRow,
  type Intent,
  type RoleLimits,
  type Violation,
} from './assignment-policy';

/** A would-be assignment for several people across several dates. */
export interface AssignmentRequest {
  userIds: string[];
  dates: string[];
  shiftDefinitionId: string | null;
  intent: Intent;
  /** Rows of this event are being replaced (series edit / split) — ignore them. */
  excludeEventId?: string;
  /** The row being edited in place (moved to another shift/place) — ignore it. */
  excludeRowId?: string;
}

export interface AssignmentViolation {
  user_id: string;
  full_name: string;
  date: string;
  rule: Violation['rule'];
  limit?: number;
}

const UNLIMITED: RoleLimits = { maxPlaces: null, maxTeams: null };
const MAX_REPORTED = 10;

const CODE: Record<Violation['rule'], ApiErrorCode> = {
  duplicate: ApiErrorCode.SCHEDULE_DUPLICATE,
  place_limit: ApiErrorCode.SCHEDULE_PLACE_LIMIT,
  team_limit: ApiErrorCode.SCHEDULE_TEAM_LIMIT,
};

/**
 * The single assignment check (ADR-063) used by every write path — manual add,
 * event create, event update and the materializer — so they can no longer
 * disagree. One query for the rows, one for the role limits, per request.
 */
@Injectable()
export class AssignmentPolicyService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(req: AssignmentRequest, manager?: EntityManager): Promise<AssignmentViolation[]> {
    const users = [...new Set(req.userIds.filter(Boolean))];
    // A shiftless (OFF) row is governed by the one-row-per-day rule elsewhere.
    if (!users.length || !req.dates.length || !req.shiftDefinitionId) return [];
    const m = manager ?? this.dataSource.manager;

    const [rows, people] = await Promise.all([
      this.existingRows(
        m,
        users,
        req.dates,
        req.shiftDefinitionId,
        req.excludeEventId,
        req.excludeRowId,
      ),
      this.limitsOf(m, users),
    ]);

    const violations: AssignmentViolation[] = [];
    for (const userId of users) {
      const person = people.get(userId);
      for (const date of req.dates) {
        const v = evaluateAssignment(
          rows.get(`${userId}:${date}`) ?? [],
          req.intent,
          person?.limits ?? UNLIMITED,
        );
        if (v) {
          violations.push({
            user_id: userId,
            full_name: person?.name ?? userId,
            date,
            rule: v.rule,
            ...('limit' in v ? { limit: v.limit } : {}),
          });
        }
      }
    }
    return violations;
  }

  /** Throw on the first rule broken, listing (a sample of) who and when. */
  async assert(req: AssignmentRequest, manager?: EntityManager): Promise<void> {
    const violations = await this.check(req, manager);
    if (!violations.length) return;
    const first = violations[0];
    const sample = violations.filter((v) => v.rule === first.rule).slice(0, MAX_REPORTED);
    throw new ApiException(
      HttpStatus.CONFLICT,
      CODE[first.rule],
      `${first.full_name} on ${first.date}: ${describe(first)}`,
      { violations: sample, total: violations.length },
    );
  }

  private async existingRows(
    m: EntityManager,
    userIds: string[],
    dates: string[],
    shiftId: string,
    excludeEventId?: string,
    excludeRowId?: string,
  ): Promise<Map<string, ExistingRow[]>> {
    const raw = (await m.query(
      `SELECT user_id, to_char(schedule_date, 'YYYY-MM-DD') AS date,
              location_id, region_id, district_id, team_category_id, schedule_event_id
         FROM schedules
        WHERE deleted_at IS NULL
          AND user_id = ANY($1::uuid[])
          AND schedule_date = ANY($2::date[])
          AND shift_definition_id = $3
          AND ($4::uuid IS NULL OR schedule_event_id IS DISTINCT FROM $4::uuid)
          AND ($5::uuid IS NULL OR id <> $5::uuid)`,
      [userIds, dates, shiftId, excludeEventId ?? null, excludeRowId ?? null],
    )) as Array<{
      user_id: string;
      date: string;
      location_id: string | null;
      region_id: string | null;
      district_id: string | null;
      team_category_id: string | null;
      schedule_event_id: string | null;
    }>;

    const byKey = new Map<string, ExistingRow[]>();
    for (const r of raw) {
      const key = `${r.user_id}:${r.date}`;
      // Team rows always carry the team's category (team events require one).
      const teamEventId = r.team_category_id
        ? (r.schedule_event_id ?? `manual-team:${r.team_category_id}`)
        : null;
      byKey.set(key, [...(byKey.get(key) ?? []), { place: schedulePlaceKey(r), teamEventId }]);
    }
    return byKey;
  }

  private async limitsOf(
    m: EntityManager,
    userIds: string[],
  ): Promise<Map<string, { name: string; limits: RoleLimits }>> {
    const rows = (await m.query(
      `SELECT u.id, u.full_name, r.max_places_per_shift, r.max_teams_per_shift
         FROM users u LEFT JOIN roles r ON r.code = u.role AND r.deleted_at IS NULL
        WHERE u.id = ANY($1::uuid[])`,
      [userIds],
    )) as Array<{
      id: string;
      full_name: string;
      max_places_per_shift: number | null;
      max_teams_per_shift: number | null;
    }>;
    return new Map(
      rows.map((r) => [
        r.id,
        {
          name: r.full_name,
          limits: { maxPlaces: r.max_places_per_shift, maxTeams: r.max_teams_per_shift },
        },
      ]),
    );
  }
}

function describe(v: AssignmentViolation): string {
  switch (v.rule) {
    case 'duplicate':
      return 'already assigned to this place (or this team) in this shift';
    case 'place_limit':
      return `already at the role's limit of ${v.limit} individual place(s) in this shift`;
    case 'team_limit':
      return `already at the role's limit of ${v.limit} team(s) in this shift`;
  }
}
