'use client';

/**
 * ClusterLayer — Supercluster-based worker clustering rendered as DOM overlays.
 * Rebuilds the cluster index only when workers change (useMemo).
 * Renders cluster circles with count + dominant-status colour and individual
 * markers when unclustered.  Handles empty workers array gracefully.
 *
 * Phase 3 sub-phase 3-4 (ADR-029)
 */

import { useMemo, useCallback } from 'react';
import Supercluster from 'supercluster';
import { cn } from '@/lib/utils/cn';
import { STATUS_COLORS, STATUS_LABELS, CLUSTER_COLORS } from '@/lib/constants/monitoring';
import type { TrackingStatus } from '@/lib/api/monitoring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterWorker {
  user_id: string;
  lat: number;
  lng: number;
  status: TrackingStatus;
  full_name?: string;
  area_name?: string | null;
}

interface PointProperties {
  user_id: string;
  status: TrackingStatus;
  full_name?: string;
  area_name?: string | null;
  cluster?: false;
}

interface ClusterProperties {
  cluster: true;
  cluster_id: number;
  point_count: number;
  /** Dominant status within this cluster (most severe first). */
  dominant_status: TrackingStatus;
}

type ClusterFeature = Supercluster.ClusterFeature<ClusterProperties>;
type PointFeature = Supercluster.PointFeature<PointProperties>;
type AnyFeature = ClusterFeature | PointFeature;

export interface ClusterLayerProps {
  workers: ClusterWorker[];
  zoom: number;
  /** Mapbox-style [west, south, east, north] bounds */
  bounds: [number, number, number, number];
  onWorkerClick: (userId: string) => void;
  onClusterClick: (clusterId: number, coords: { lat: number; lng: number }) => void;
  /** Pixel coordinates lookup — provided by the parent map component */
  lngLatToPixel: (lng: number, lat: number) => { x: number; y: number } | null;
  /** Optionally highlight a worker */
  selectedUserId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Severity order used for dominant-status computation inside clusters. */
const SEVERITY: TrackingStatus[] = ['missing', 'outside_area', 'inactive', 'active', 'offline'];

function dominantStatus(statuses: TrackingStatus[]): TrackingStatus {
  for (const s of SEVERITY) {
    if (statuses.includes(s)) return s;
  }
  return 'offline';
}

function clusterColor(status: TrackingStatus): string {
  switch (status) {
    case 'missing':
      return CLUSTER_COLORS.critical;
    case 'outside_area':
      return CLUSTER_COLORS.warning;
    case 'active':
    case 'inactive':
      return CLUSTER_COLORS.normal;
    default:
      return CLUSTER_COLORS.neutral;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClusterLayer({
  workers,
  zoom,
  bounds,
  onWorkerClick,
  onClusterClick,
  lngLatToPixel,
  selectedUserId,
}: ClusterLayerProps) {
  // Build GeoJSON point features from workers
  const points = useMemo<PointFeature[]>(() => {
    if (!workers.length) return [];
    return workers
      .filter((w) => w.lat !== 0 && w.lng !== 0)
      .map(
        (w): PointFeature => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [w.lng, w.lat] },
          properties: {
            user_id: w.user_id,
            status: w.status,
            full_name: w.full_name,
            area_name: w.area_name,
            cluster: false,
          },
        })
      );
  }, [workers]);

  // Build supercluster index — only rebuilt when points change
  const sc = useMemo(() => {
    const index = new Supercluster<PointProperties, ClusterProperties>({
      radius: 60,
      maxZoom: 16,
      map: (props) => ({
        cluster: true,
        cluster_id: 0,
        point_count: 1,
        dominant_status: props.status,
      }),
      reduce: (acc, props) => {
        const statuses = [acc.dominant_status, props.dominant_status];
        acc.dominant_status = dominantStatus(statuses);
        acc.point_count = (acc.point_count ?? 0) + 1;
      },
    });
    index.load(points);
    return index;
  }, [points]);

  // Get clusters for current viewport
  const clusters = useMemo<AnyFeature[]>(() => {
    if (!points.length) return [];
    return sc.getClusters(bounds, Math.floor(zoom)) as AnyFeature[];
  }, [sc, bounds, zoom, points.length]);

  const handleClusterClick = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      onClusterClick(clusterId, { lat, lng });
    },
    [onClusterClick]
  );

  if (!clusters.length) return null;

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const pixel = lngLatToPixel(lng, lat);
        if (!pixel) return null;

        const isCluster = 'cluster_id' in feature.properties && feature.properties.cluster;

        if (isCluster) {
          const { cluster_id, point_count, dominant_status: ds } =
            feature.properties as ClusterProperties;
          const color = clusterColor(ds as TrackingStatus);
          return (
            <ClusterCircle
              key={`cluster-${cluster_id}`}
              x={pixel.x}
              y={pixel.y}
              count={point_count}
              color={color}
              dominantStatus={ds as TrackingStatus}
              onClick={() => handleClusterClick(cluster_id, lng, lat)}
            />
          );
        }

        const { user_id, status, full_name, area_name } = feature.properties as PointProperties;
        const isSelected = selectedUserId === user_id;
        return (
          <WorkerPin
            key={`worker-${user_id}`}
            x={pixel.x}
            y={pixel.y}
            status={status}
            fullName={full_name}
            areaName={area_name}
            isSelected={isSelected}
            onClick={() => onWorkerClick(user_id)}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ClusterCircleProps {
  x: number;
  y: number;
  count: number;
  color: string;
  dominantStatus: TrackingStatus;
  onClick: () => void;
}

function ClusterCircle({ x, y, count, color, dominantStatus, onClick }: ClusterCircleProps) {
  const size = count > 50 ? 52 : count > 20 ? 44 : count > 5 ? 38 : 32;
  const label = STATUS_LABELS[dominantStatus];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Kluster ${count} petugas — status dominan: ${label}`}
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        backgroundColor: color,
        border: '2px solid var(--color-nb-black)',
        boxShadow: '3px 3px 0 var(--color-nb-black)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 10,
        color: '#fff',
        fontWeight: 700,
        fontSize: count > 99 ? 10 : 13,
        lineHeight: 1,
        transition: 'transform 0.1s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      {count > 99 ? '99+' : count}
    </button>
  );
}

interface WorkerPinProps {
  x: number;
  y: number;
  status: TrackingStatus;
  fullName?: string;
  areaName?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

function WorkerPin({ x, y, status, fullName, areaName, isSelected, onClick }: WorkerPinProps) {
  const color = STATUS_COLORS[status] ?? '#6B7280';
  const size = isSelected ? 18 : 14;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${fullName ?? 'Petugas'} — ${STATUS_LABELS[status]}${areaName ? ` — ${areaName}` : ''}`}
      className={cn(
        'absolute rounded-full cursor-pointer transition-transform duration-100',
        isSelected && 'ring-2 ring-offset-1 ring-nb-black'
      )}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        backgroundColor: color,
        border: `2px solid var(--color-nb-black)`,
        boxShadow: isSelected ? '3px 3px 0 var(--color-nb-black)' : '2px 2px 0 var(--color-nb-black)',
        zIndex: isSelected ? 20 : 5,
        transform: isSelected ? 'scale(1.2)' : undefined,
      }}
    />
  );
}
