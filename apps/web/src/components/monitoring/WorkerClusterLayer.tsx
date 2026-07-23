'use client';

/**
 * WorkerClusterLayer — renders EVERY worker as an individual pin (no clustering).
 * Clustering (the supercluster count bubbles) was removed on request: it hid
 * people and confused operators. Each worker is always drawn; the only optional
 * collapse is team bubbles (the "Tim" layer toggle), which group a team's members
 * into one bubble that expands on click. Team identity otherwise rides each pin's
 * color.
 *
 * Renders on `AdvancedMarkerElement` via {@link AdvancedPinMarker}. Each pin's
 * content is memoized by visual signature, so a GPS ping that only moves a worker
 * repositions the marker in place instead of rebuilding it (reposition-on-patch,
 * profiled 47× cheaper than clear-and-rebuild) — which is what keeps hundreds of
 * live pins smooth at district/kawasan/lokasi scope.
 */
import { useMemo } from 'react';
import { AdvancedPinMarker } from './AdvancedPinMarker';
import { workerPinElement, statusToActivity, teamMarkerElement } from '@/lib/monitoring/markers';
import { groupWorkersByTeam, type TeamGroup } from '@/lib/monitoring/teamGrouping';
import type { SimpleWorker } from './SimpleMonitoringMap';

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface WorkerClusterLayerProps {
  workers: SimpleWorker[];
  zoom: number;
  /** Retained for signature compatibility; unused now that there is no clustering. */
  bounds?: MapBounds | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  /** Clicking a team marker opens its member list (no zoom-to-reveal). */
  onTeamClick?: (team: TeamGroup) => void;
  /** Collapse ≥2-member teams into one team marker. When false, every worker
   *  (team members included) renders as its own pin. */
  teamBubbles?: boolean;
}

type Renderable = SimpleWorker | TeamGroup;
const isTeam = (r: Renderable): r is TeamGroup => 'kind' in r && r.kind === 'team';

export function WorkerClusterLayer({
  workers,
  zoom,
  selectedId,
  onSelect,
  onTeamClick,
  teamBubbles = true,
}: WorkerClusterLayerProps) {
  // Group workers by team when the Tim layer is on. Teams ALWAYS collapse into
  // one marker regardless of zoom (expandZoom = Infinity) — you reveal the members
  // by CLICKING the team marker, never by zooming. Tim off → every worker renders
  // individually. No supercluster: drawn one-to-one.
  const renderables = useMemo<Renderable[]>(
    () =>
      groupWorkersByTeam(workers, zoom, teamBubbles ? Number.POSITIVE_INFINITY : 0).filter(
        (r) => Number.isFinite(r.lat) && Number.isFinite(r.lng)
      ),
    [workers, zoom, teamBubbles]
  );

  return (
    <>
      {renderables.map((r) => {
        if (isTeam(r)) {
          // Team marker (≥2-member team, Tim layer on) — click reveals members.
          const signature = `team|${r.team_color ?? ''}|${r.team_icon ?? ''}|${r.member_count}|${r.team_name}`;
          return (
            <AdvancedPinMarker
              key={`team-${r.team_id}`}
              position={{ lat: r.lat, lng: r.lng }}
              signature={signature}
              build={() =>
                teamMarkerElement(r.team_color, r.member_count, r.team_icon, {
                  text: r.team_name,
                  className: 'worker-marker-label',
                })
              }
              onClick={() => onTeamClick?.(r)}
              title={r.team_name}
              zIndex={5}
            />
          );
        }
        // Individual worker pin. `selected` is baked into the signature so selecting
        // a worker rebuilds only that one pin.
        const selected = r.user_id === selectedId;
        const signature =
          `worker|${r.role}|${r.status}|${r.is_within_area}|${r.is_scheduled}` +
          `|${r.role_marker_icon ?? ''}|${selected ? 1 : 0}|${r.full_name}`;
        return (
          <AdvancedPinMarker
            key={`worker-${r.user_id}`}
            position={{ lat: r.lat, lng: r.lng }}
            signature={signature}
            build={() =>
              workerPinElement(
                r.role,
                {
                  activity: statusToActivity(r.status),
                  outside: !r.is_within_area,
                  adHoc: !r.is_scheduled,
                  selected,
                  markerIcon: r.role_marker_icon ?? null,
                  lifecycleState: r.lifecycle_state ?? null,
                  leaveReason: r.leave_reason ?? null,
                },
                { text: r.full_name, className: 'worker-marker-label' }
              )
            }
            onClick={() => onSelect?.(r.user_id)}
            title={r.full_name}
            zIndex={selected ? 10 : 4}
          />
        );
      })}
    </>
  );
}
