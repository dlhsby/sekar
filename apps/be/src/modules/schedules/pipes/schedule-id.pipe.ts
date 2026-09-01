import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `projected:<eventId>:<userId>:<YYYY-MM-DD>` — see `remove` in `schedules.mutations.ts`. */
const PROJECTED = /^projected:[0-9a-f-]{36}:[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$/i;

/**
 * A schedule id is EITHER a row's uuid OR a projected occurrence's synthetic
 * key, so `ParseUUIDPipe` cannot be used here — it would reject the projected
 * form, which is the only way to tombstone an occurrence that has no row.
 *
 * Without any validation an unparseable id reached Postgres and came back as
 * `22P02 invalid input syntax for type uuid`, which the filter reports as a
 * **500**. A malformed id is the caller's mistake, not the server's.
 */
@Injectable()
export class ScheduleIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value === 'string' && (UUID.test(value) || PROJECTED.test(value))) {
      return value;
    }
    throw new BadRequestException(
      'id must be a schedule uuid or a projected occurrence key (projected:<event>:<user>:<date>)',
    );
  }
}
