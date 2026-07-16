'use client';

/**
 * WorkerClusterLayer — renders individual worker pins + team bubbles clustered
 * with supercluster ("Semua Petugas" mode). Zoomed out, dense workers collapse
 * into count bubbles; team bubbles group ≥2-member teams. Zooming in (or
 * clicking a cluster) splits them into pins and individual team members.
 * This keeps the map responsive even when hundreds of workers are on screen.
 */
import { useMemo } from 'react';
import { Marker } from '@react-google-maps/api';
import Supercluster from 'supercluster';
import { workerPinIcon, statusToActivity, teamBubbleIcon } from '@/lib/monitoring/markers';
import { groupWorkersByTeam, type TeamGroup } from '@/lib/monitoring/teamGrouping';
import type { SimpleWorker } from './SimpleMonitoringMap';

/* eslint-disable sekar-design/no-inline-hex-colors -- Google overlay options, not rendered style tokens */
const BLACK = '#1C1917';
const WHITE = '#FFFFFF';
const CLUSTER = '#1A4D2E';
/* eslint-enable sekar-design/no-inline-hex-colors */

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface WorkerClusterLayerProps {
  workers: SimpleWorker[];
  zoom: number;
  bounds: MapBounds | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  onClusterClick?: (lat: number, lng: number, expansionZoom: number) => void;
}

type WorkerProps = {
  kind?: 'worker';
  workerId: string;
  status: string;
  role: string;
  full_name: string;
  within: boolean;
  scheduled: boolean;
};

type TeamProps = {
  kind: 'team';
  team_id: string;
  team_name: string;
  team_color: string | null;
  member_count: number;
  member_ids: string[];
};

type FeatureProps = WorkerProps | TeamProps;

function clusterSymbol(pointCount: number): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: Math.min(24, 12 + Math.log2(pointCount + 1) * 3),
    fillColor: CLUSTER,
    fillOpacity: 0.92,
    strokeColor: BLACK,
    strokeWeight: 2,
  };
}

export function WorkerClusterLayer({
  workers,
  zoom,
  bounds,
  selectedId,
  onSelect,
  onClusterClick,
}: WorkerClusterLayerProps) {
  // Group workers by team (collapses ≥2-member teams into bubbles below expansionZoom).
  const renderables = useMemo(() => groupWorkersByTeam(workers, zoom, 17), [workers, zoom]);

  // Build the supercluster index from workers + team groups with valid coordinates.
  const index = useMemo(() => {
    const sc = new Supercluster<FeatureProps>({ radius: 60, maxZoom: 18 });
    sc.load(
      renderables
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        .map((r) => {
          if ('kind' in r && r.kind === 'team') {
            const team = r as TeamGroup;
            return {
              type: 'Feature' as const,
              properties: {
                kind: 'team' as const,
                team_id: team.team_id,
                team_name: team.team_name,
                team_color: team.team_color,
                member_count: team.member_count,
                member_ids: team.member_ids,
              },
              geometry: { type: 'Point' as const, coordinates: [team.lng, team.lat] },
            };
          }
          const worker = r as SimpleWorker;
          return {
            type: 'Feature' as const,
            properties: {
              kind: 'worker' as const,
              workerId: worker.user_id,
              status: worker.status,
              role: worker.role,
              full_name: worker.full_name,
              within: worker.is_within_area,
              scheduled: worker.is_scheduled,
            },
            geometry: { type: 'Point' as const, coordinates: [worker.lng, worker.lat] },
          };
        })
    );
    return sc;
  }, [renderables]);

  const clusters = useMemo(() => {
    const bbox: [number, number, number, number] = bounds
      ? [bounds.west, bounds.south, bounds.east, bounds.north]
      : [-180, -85, 180, 85];
    return index.getClusters(bbox, Math.round(zoom));
  }, [index, bounds, zoom]);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as
          | (FeatureProps & { cluster?: false })
          | { cluster: true; cluster_id: number; point_count: number };

        // Supercluster cluster (count bubble).
        if ('cluster' in props && props.cluster) {
          return (
            <Marker
              key={`cluster-${props.cluster_id}`}
              position={{ lat, lng }}
              icon={clusterSymbol(props.point_count)}
              label={{
                text: String(props.point_count),
                color: WHITE,
                fontSize: '11px',
                fontWeight: '700',
              }}
              onClick={() => {
                const expansionZoom = Math.min(index.getClusterExpansionZoom(props.cluster_id), 18);
                onClusterClick?.(lat, lng, expansionZoom);
              }}
              zIndex={6}
            />
          );
        }

        // Team bubble (≥2-member team).
        if ('kind' in props && props.kind === 'team') {
          const team = props as TeamProps;
          return (
            <Marker
              key={`team-${team.team_id}`}
              position={{ lat, lng }}
              icon={teamBubbleIcon(team.team_color, team.member_count, team.team_name)}
              onClick={() => {
                // Zoom to expand and reveal individual team members.
                onClusterClick?.(lat, lng, 17);
              }}
              zIndex={5}
            />
          );
        }

        // Individual worker pin.
        const leaf = props as WorkerProps;
        const selected = leaf.workerId === selectedId;
        return (
          <Marker
            key={`worker-${leaf.workerId}`}
            position={{ lat, lng }}
            icon={workerPinIcon(leaf.role, {
              activity: statusToActivity(leaf.status),
              outside: !leaf.within,
              adHoc: !leaf.scheduled,
              selected,
            })}
            onClick={() => onSelect?.(leaf.workerId)}
            zIndex={selected ? 10 : 4}
          />
        );
      })}
    </>
  );
}
