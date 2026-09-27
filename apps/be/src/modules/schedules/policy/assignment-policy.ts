/**
 * The assignment rule for ONE person in ONE shift on ONE day (UAT 2026-09-26,
 * ADR-063). Pure — the service loads the rows and the role limits.
 *
 * A person's rows in a shift are of two kinds:
 *  - individual: their own place (a manual row or an individual event);
 *  - team: a membership of a team event (the team decides the place).
 * The role caps each kind separately (`max_places_per_shift`,
 * `max_teams_per_shift`; null = unlimited). Individual and team never block
 * each other — "assigned alone at A, and with the team at B" is the intended
 * case. An exact repeat (same place as an individual, or the same team) is a
 * duplicate for every role.
 */

export interface RoleLimits {
  /** Max distinct individual places per shift; null = unlimited. */
  maxPlaces: number | null;
  /** Max distinct team memberships per shift; null = unlimited. */
  maxTeams: number | null;
}

export interface ExistingRow {
  /** schedulePlaceKey of the row. */
  place: string;
  /** The team event this row belongs to, or null for an individual row. */
  teamEventId: string | null;
}

export type Intent =
  | { kind: 'individual'; place: string }
  | { kind: 'team'; place: string; eventId: string };

export type Violation =
  | { rule: 'duplicate' }
  | { rule: 'place_limit'; limit: number }
  | { rule: 'team_limit'; limit: number };

export function evaluateAssignment(
  existing: readonly ExistingRow[],
  intent: Intent,
  limits: RoleLimits,
): Violation | null {
  if (intent.kind === 'individual') {
    const places = new Set(existing.filter((r) => r.teamEventId === null).map((r) => r.place));
    if (places.has(intent.place)) return { rule: 'duplicate' };
    if (limits.maxPlaces !== null && places.size + 1 > limits.maxPlaces) {
      return { rule: 'place_limit', limit: limits.maxPlaces };
    }
    return null;
  }

  const teams = new Set(
    existing.map((r) => r.teamEventId).filter((id): id is string => id !== null),
  );
  if (teams.has(intent.eventId)) return { rule: 'duplicate' };
  if (limits.maxTeams !== null && teams.size + 1 > limits.maxTeams) {
    return { rule: 'team_limit', limit: limits.maxTeams };
  }
  return null;
}
