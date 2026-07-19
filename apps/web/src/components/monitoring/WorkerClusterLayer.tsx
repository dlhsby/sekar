'use client';

/**
 * WorkerClusterLayer — renders EVERY worker as an individual pin (no clustering).
 * Clustering (the supercluster count bubbles) was removed on request: it hid
 * people and confused operators. Each worker is always drawn; the only optional
 * collapse is team bubbles (the "Tim" layer toggle), which group a team's members
 * into one bubble that expands on click. Team identity otherwise rides each pin's
 * color. Trade-off: with hundreds of pins on screen the map does more work than
 * the old clustered layer — acceptable at rayon/kawasan/lokasi scope where the
 * live worker count is bounded.
 */
import { useMemo } from 'react';
import { Marker } from '@react-google-maps/api';
import { workerPinIcon, statusToActivity, teamBubbleIcon } from '@/lib/monitoring/markers';
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
  /** Zoom + recenter when a team bubble is clicked (to reveal its members). */
  onClusterClick?: (lat: number, lng: number, expansionZoom: number) => void;
  /** Collapse ≥2-member teams into one bubble below the expand zoom. When false,
   *  every worker (team members included) renders as its own pin. */
  teamBubbles?: boolean;
}

export function WorkerClusterLayer({
  workers,
  zoom,
  selectedId,
  onSelect,
  onClusterClick,
  teamBubbles = true,
}: WorkerClusterLayerProps) {
  // Group workers by team only when the Tim layer is on (collapses ≥2-member
  // teams below the expand zoom). Otherwise every worker renders individually.
  // No supercluster: the returned renderables are drawn one-to-one.
  const renderables = useMemo(
    () =>
      groupWorkersByTeam(workers, zoom, teamBubbles ? 17 : 0).filter(
        (r) => Number.isFinite(r.lat) && Number.isFinite(r.lng)
      ),
    [workers, zoom, teamBubbles]
  );

  return (
    <>
      {renderables.map((r) => {
        // Team bubble (≥2-member team, Tim layer on, below expand zoom).
        if ('kind' in r && r.kind === 'team') {
          const team = r as TeamGroup;
          return (
            <Marker
              key={`team-${team.team_id}`}
              position={{ lat: team.lat, lng: team.lng }}
              icon={teamBubbleIcon(team.team_color, team.member_count, team.team_name)}
              onClick={() => onClusterClick?.(team.lat, team.lng, 17)}
              zIndex={5}
            />
          );
        }

        // Individual worker pin.
        const worker = r as SimpleWorker;
        const selected = worker.user_id === selectedId;
        return (
          <Marker
            key={`worker-${worker.user_id}`}
            position={{ lat: worker.lat, lng: worker.lng }}
            icon={workerPinIcon(worker.role, {
              activity: statusToActivity(worker.status),
              outside: !worker.is_within_area,
              adHoc: !worker.is_scheduled,
              selected,
              markerIcon: worker.role_marker_icon ?? null,
            })}
            label={{
              text: worker.full_name,
              className: 'worker-marker-label',
              fontSize: '11px',
              fontWeight: '600',
            }}
            onClick={() => onSelect?.(worker.user_id)}
            zIndex={selected ? 10 : 4}
          />
        );
      })}
    </>
  );
}
