import { pickTeamRows } from '../schedules.lookups';
import type { Schedule } from '../entities/schedule.entity';

const row = (user_id: string, shift: string, location_id: string, event: string) =>
  ({ user_id, shift_definition_id: shift, location_id, schedule_event_id: event }) as Schedule;

describe('pickTeamRows (ADR-064)', () => {
  it('ignores a team from another shift today', () => {
    const rows = [row('u1', 'S1', 'A', 'morning-team'), row('u1', 'S2', 'B', 'afternoon-team')];
    const picked = pickTeamRows(rows, new Map([['u1', { shiftDefinitionId: 'S2' }]]));
    expect(picked.map((r) => r.schedule_event_id)).toEqual(['afternoon-team']);
  });

  it('a korlap in several teams this shift: the team where they are wins', () => {
    const rows = [row('k', 'S1', 'A', 't-a'), row('k', 'S1', 'B', 't-b')];
    const picked = pickTeamRows(
      rows,
      new Map([['k', { shiftDefinitionId: 'S1', locationId: 'B' }]]),
    );
    expect(picked.map((r) => r.schedule_event_id)).toEqual(['t-b']);
  });

  it('falls back to the earliest team when not at any of them', () => {
    const rows = [row('k', 'S1', 'A', 't-a'), row('k', 'S1', 'B', 't-b')];
    expect(pickTeamRows(rows, new Map()).map((r) => r.schedule_event_id)).toEqual(['t-a']);
  });

  it('a worker whose only team is on another shift has no team now', () => {
    const rows = [row('u1', 'S1', 'A', 'morning-team')];
    expect(pickTeamRows(rows, new Map([['u1', { shiftDefinitionId: 'S2' }]]))).toEqual([]);
  });
});
