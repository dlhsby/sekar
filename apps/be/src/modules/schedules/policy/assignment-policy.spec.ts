import { evaluateAssignment, type ExistingRow, type RoleLimits } from './assignment-policy';

/**
 * The assignment rule (UAT, 2026-09-26) as a pure function:
 *  - satgas/linmas: at most ONE individual place per shift, plus at most ONE
 *    team in that same shift (same or different place);
 *  - korlap: any number of places and teams in the same shift;
 *  - an exact duplicate (same person, shift, place, kind) is never allowed.
 * Limits come from the role (`max_places_per_shift`, `max_teams_per_shift`).
 */
const SATGAS: RoleLimits = { maxPlaces: 1, maxTeams: 1 };
const KORLAP: RoleLimits = { maxPlaces: null, maxTeams: null };

const individual = (place: string): ExistingRow => ({ place, teamEventId: null });
const team = (place: string, eventId: string): ExistingRow => ({ place, teamEventId: eventId });

describe('evaluateAssignment', () => {
  describe('satgas / linmas (1 place + 1 team per shift)', () => {
    it('allows a first individual place', () => {
      expect(evaluateAssignment([], { kind: 'individual', place: 'A' }, SATGAS)).toBeNull();
    });

    it('refuses a second individual place in the same shift', () => {
      expect(
        evaluateAssignment([individual('A')], { kind: 'individual', place: 'B' }, SATGAS),
      ).toEqual({
        rule: 'place_limit',
        limit: 1,
      });
    });

    it('allows a team on top of an individual place — at a DIFFERENT place', () => {
      expect(
        evaluateAssignment([individual('A')], { kind: 'team', place: 'B', eventId: 't1' }, SATGAS),
      ).toBeNull();
    });

    it('allows a team on top of an individual place — at the SAME place', () => {
      expect(
        evaluateAssignment([individual('A')], { kind: 'team', place: 'A', eventId: 't1' }, SATGAS),
      ).toBeNull();
    });

    it('allows an individual place on top of a team', () => {
      expect(
        evaluateAssignment([team('B', 't1')], { kind: 'individual', place: 'A' }, SATGAS),
      ).toBeNull();
    });

    it('refuses a second team in the same shift', () => {
      expect(
        evaluateAssignment([team('A', 't1')], { kind: 'team', place: 'B', eventId: 't2' }, SATGAS),
      ).toEqual({ rule: 'team_limit', limit: 1 });
    });

    it('refuses the third assignment once both slots are used', () => {
      const existing = [individual('A'), team('B', 't1')];
      expect(evaluateAssignment(existing, { kind: 'individual', place: 'C' }, SATGAS)).toEqual({
        rule: 'place_limit',
        limit: 1,
      });
      expect(
        evaluateAssignment(existing, { kind: 'team', place: 'C', eventId: 't2' }, SATGAS),
      ).toEqual({
        rule: 'team_limit',
        limit: 1,
      });
    });
  });

  describe('korlap (unlimited)', () => {
    it('allows many places and many teams in the same shift', () => {
      const existing = [individual('A'), individual('B'), team('C', 't1'), team('A', 't2')];
      expect(evaluateAssignment(existing, { kind: 'individual', place: 'D' }, KORLAP)).toBeNull();
      expect(
        evaluateAssignment(existing, { kind: 'team', place: 'D', eventId: 't3' }, KORLAP),
      ).toBeNull();
    });
  });

  describe('duplicates (every role)', () => {
    it.each([
      ['satgas', SATGAS],
      ['korlap', KORLAP],
    ])('%s: same individual place twice is a duplicate', (_r, limits) => {
      expect(
        evaluateAssignment([individual('A')], { kind: 'individual', place: 'A' }, limits),
      ).toEqual({
        rule: 'duplicate',
      });
    });

    it('the same team twice is a duplicate, not a second team', () => {
      expect(
        evaluateAssignment([team('A', 't1')], { kind: 'team', place: 'A', eventId: 't1' }, KORLAP),
      ).toEqual({ rule: 'duplicate' });
    });
  });

  it('a role with 0 teams may never join a team', () => {
    expect(
      evaluateAssignment(
        [],
        { kind: 'team', place: 'A', eventId: 't1' },
        { maxPlaces: 1, maxTeams: 0 },
      ),
    ).toEqual({ rule: 'team_limit', limit: 0 });
  });
});
