/**
 * teamGrouping — pure helper that collapses multi-member teams into one
 * team-colored marker on the monitoring map (ADR-048), mirroring the web
 * `lib/monitoring/teamGrouping.ts`. Individual workers and single-member teams
 * render as normal pins. No React, no side effects.
 *
 * A team is a RENDERING grouping only (no geofence/counting change). Tapping a
 * team marker (handled by the screen) reveals its members and hides the other
 * individual workers — this helper just produces the renderables.
 */

import type { LiveUser } from '../types/monitoring.types';

/** A team bubble — ≥2 members of a team collapsed into one renderable. */
export interface TeamGroup {
  kind: 'team';
  team_id: string;
  team_name: string;
  team_color: string | null;
  team_icon: string | null;
  latitude: number;
  longitude: number;
  member_ids: string[];
  member_count: number;
}

/** Individual workers implicitly have no `kind`; a TeamGroup has `kind: 'team'`. */
export type RenderableWorker = LiveUser | TeamGroup;

/** Type guard: is this renderable a collapsed team bubble? */
export function isTeamGroup(r: RenderableWorker): r is TeamGroup {
  return (r as TeamGroup).kind === 'team';
}

/**
 * Group workers by team, collapsing teams with ≥2 members into team bubbles at
 * the members' centroid. Single-member teams and unteamed workers stay individual.
 * Stable order: a TeamGroup is inserted at the first occurrence of its team.
 *
 * @param workers input worker list (may contain several members of a team)
 * @param expand  when true, return every worker individually (no collapsing) —
 *                used when a team is selected/expanded to show its members.
 */
export function groupWorkersByTeam(
  workers: LiveUser[],
  expand = false,
): RenderableWorker[] {
  if (expand) return [...workers];

  const teamMap = new Map<string, LiveUser[]>();
  for (const w of workers) {
    if (!w.team_id) continue;
    const arr = teamMap.get(w.team_id);
    if (arr) arr.push(w);
    else teamMap.set(w.team_id, [w]);
  }

  const result: RenderableWorker[] = [];
  const processed = new Set<string>();

  for (const w of workers) {
    if (!w.team_id) {
      result.push(w);
      continue;
    }
    if (processed.has(w.team_id)) continue;
    processed.add(w.team_id);
    const members = teamMap.get(w.team_id) as LiveUser[];

    if (members.length < 2) {
      result.push(...members);
      continue;
    }
    const finite = members.filter(
      m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude),
    );
    if (finite.length === 0) {
      result.push(...members);
      continue;
    }
    const latitude = finite.reduce((s, m) => s + m.latitude, 0) / finite.length;
    const longitude = finite.reduce((s, m) => s + m.longitude, 0) / finite.length;
    const first = members[0];
    result.push({
      kind: 'team',
      team_id: w.team_id,
      team_name: first.team_name || '',
      team_color: first.team_color ?? null,
      team_icon: first.team_icon ?? null,
      latitude,
      longitude,
      member_ids: members.map(m => m.id),
      member_count: members.length,
    });
  }
  return result;
}
