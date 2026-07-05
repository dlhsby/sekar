'use client';

/**
 * WorkerClusterLayer — renders individual worker pins clustered with
 * supercluster ("Semua Petugas" mode). Zoomed out, dense workers collapse into
 * count bubbles; zooming in (or clicking a cluster) splits them into pins. This
 * keeps the map responsive even when hundreds of workers are on screen — the old
 * map rendered one Google overlay per worker with no clustering.
 */
import { useMemo } from 'react';
import { Marker } from '@react-google-maps/api';
import Supercluster from 'supercluster';
import { STATUS_COLORS } from '@/lib/constants/monitoring';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
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

type WorkerProps = { workerId: string; status: string; full_name: string };

function statusColor(status: string): string {
  return STATUS_COLORS[status as TrackingStatus] ?? STATUS_COLORS.offline;
}

function workerSymbol(status: string, selected: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? 11 : 7,
    fillColor: statusColor(status),
    fillOpacity: 1,
    strokeColor: selected ? BLACK : WHITE,
    strokeWeight: 2,
  };
}

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
  // Build the supercluster index from workers with valid coordinates.
  const index = useMemo(() => {
    const sc = new Supercluster<WorkerProps>({ radius: 60, maxZoom: 18 });
    sc.load(
      workers
        .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng))
        .map((w) => ({
          type: 'Feature' as const,
          properties: { workerId: w.user_id, status: w.status, full_name: w.full_name },
          geometry: { type: 'Point' as const, coordinates: [w.lng, w.lat] },
        }))
    );
    return sc;
  }, [workers]);

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
          | (WorkerProps & { cluster?: false })
          | { cluster: true; cluster_id: number; point_count: number };

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

        const leaf = props as WorkerProps;
        const selected = leaf.workerId === selectedId;
        return (
          <Marker
            key={`worker-${leaf.workerId}`}
            position={{ lat, lng }}
            icon={workerSymbol(leaf.status, selected)}
            onClick={() => onSelect?.(leaf.workerId)}
            zIndex={selected ? 10 : 4}
          />
        );
      })}
    </>
  );
}
