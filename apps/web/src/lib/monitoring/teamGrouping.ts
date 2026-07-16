/**
 * Team Grouping — pure helper to collapse multi-member teams into team-colored
 * bubbles on the monitoring map. Individual workers or single-member teams render
 * as normal pins. When zoomed in >= expandZoom, all workers render individually.
 *
 * This is a deterministic, dependency-free utility — no React, no side effects.
 */

import type { SimpleWorker } from '@/components/monitoring/SimpleMonitoringMap';

/**
 * A team bubble — represents ≥2 members of a team collapsed into one renderable.
 * Replaces individual SimpleWorker entries in the clustering layer.
 */
export interface TeamGroup {
  kind: 'team';
  team_id: string;
  team_name: string;
  team_color: string | null;
  lat: number;
  lng: number;
  member_ids: string[];
  member_count: number;
}

/**
 * A renderable worker or team. Individual workers implicitly have `kind: 'worker'`
 * (via the absence of a `kind` field); TeamGroup has `kind: 'team'`.
 */
export type RenderableWorker = SimpleWorker | TeamGroup;

/**
 * Group workers by team, collapsing teams with ≥2 members into team bubbles.
 *
 * @param workers Input worker list (may contain duplicates from the same team)
 * @param zoom Current map zoom level
 * @param expandZoom Zoom threshold: at zoom >= expandZoom, all workers render individually (no collapsing)
 * @returns Mixed list of SimpleWorker and TeamGroup, in stable order
 *
 * Behavior:
 * - At zoom >= expandZoom: return all workers as-is (no grouping).
 * - Below expandZoom:
 *   - Teams with ≥2 members + finite coords collapse into ONE TeamGroup (centroid lat/lng, member_count, team_name/color).
 *   - Teams with 1 member, or workers with team_id == null, stay as SimpleWorker.
 *   - Workers with non-finite coords are skipped (already filtered by supercluster).
 * - Stable order: TeamGroups inserted at the first occurrence of their team in the input list.
 */
export function groupWorkersByTeam(
  workers: SimpleWorker[],
  zoom: number,
  expandZoom = 17
): RenderableWorker[] {
  // At high zoom, render every worker individually (no collapsing).
  if (zoom >= expandZoom) {
    return workers;
  }

  // Group workers by team_id.
  const teamMap = new Map<string, SimpleWorker[]>();
  const seenTeams = new Set<string>();

  for (const w of workers) {
    if (w.team_id && !seenTeams.has(w.team_id)) {
      teamMap.set(w.team_id, []);
      seenTeams.add(w.team_id);
    }
    if (w.team_id) {
      teamMap.get(w.team_id)!.push(w);
    }
  }

  const result: RenderableWorker[] = [];
  const processedTeams = new Set<string>();

  // Single pass: preserve original order, replacing first team member with the group.
  for (const w of workers) {
    if (!w.team_id) {
      // Unteamed worker: add as-is.
      result.push(w);
    } else if (!processedTeams.has(w.team_id)) {
      // First member of a team: add the group or individual members.
      processedTeams.add(w.team_id);
      const teamMembers = teamMap.get(w.team_id)!;

      // Collapse teams with ≥2 members into a TeamGroup.
      if (teamMembers.length >= 2) {
        // Collect finite coordinates for centroid calculation.
        const finiteMembers = teamMembers.filter(
          (m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)
        );
        if (finiteMembers.length > 0) {
          const lat = finiteMembers.reduce((sum, m) => sum + m.lat, 0) / finiteMembers.length;
          const lng = finiteMembers.reduce((sum, m) => sum + m.lng, 0) / finiteMembers.length;
          const first = teamMembers[0];
          result.push({
            kind: 'team',
            team_id: w.team_id,
            team_name: first.team_name || '',
            team_color: first.team_color ?? null,
            lat,
            lng,
            member_ids: teamMembers.map((m) => m.user_id),
            member_count: teamMembers.length,
          });
        } else {
          // All members have non-finite coords; add as individuals.
          result.push(...teamMembers);
        }
      } else {
        // Single-member team; render as individual worker.
        result.push(...teamMembers);
      }
      // Skip other members of this team (they've been processed).
    }
    // (else: this worker's team was already processed, skip it)
  }

  return result;
}
