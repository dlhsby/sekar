'use client';

/**
 * NodeMarkerLayer — the drill-down node markers on the monitoring map. One
 * marker per node at the current scope: the single Surabaya summary (top level),
 * one per rayon (city scope) or one per area (rayon scope). Each shows the
 * attendance ratio `hadir/terjadwal` colored by staffing health; clicking drills
 * one level deeper. Replaces the old status-only "Ringkasan" bubbles.
 */
import { useMemo, useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { nodeRatioIcon } from '@/lib/monitoring/markers';

export interface NodeMarker {
  id: string;
  name: string;
  variant: 'rayon' | 'area' | 'surabaya';
  lat: number;
  lng: number;
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
}

export interface NodeMarkerLayerProps {
  nodes: NodeMarker[];
  onDrill?: (node: NodeMarker) => void;
}

export function NodeMarkerLayer({ nodes, onDrill }: NodeMarkerLayerProps) {
  const { t } = useTranslation();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const placed = useMemo(
    () => nodes.filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng)),
    [nodes]
  );
  const hovered = hoverId ? placed.find((n) => n.id === hoverId) : null;

  return (
    <>
      {placed.map((node) => (
        <Marker
          key={`node-${node.id}`}
          position={{ lat: node.lat, lng: node.lng }}
          onClick={() => onDrill?.(node)}
          onMouseOver={() => setHoverId(node.id)}
          onMouseOut={() => setHoverId((cur) => (cur === node.id ? null : cur))}
          icon={nodeRatioIcon(node.variant, node.scheduled, node.clocked_in)}
          zIndex={node.variant === 'surabaya' ? 8 : 5}
        />
      ))}

      {hovered && (
        <InfoWindow
          position={{ lat: hovered.lat, lng: hovered.lng }}
          onCloseClick={() => setHoverId(null)}
          options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -12) }}
        >
          <div className="text-xs text-nb-black">
            <div className="font-bold">{hovered.name}</div>
            <div className="mt-1 flex flex-col gap-0.5">
              <span>
                {t('monitoring:aggregate.scheduledLabel')}:{' '}
                <span className="font-mono font-bold tabular-nums">{hovered.scheduled}</span>
              </span>
              <span>
                {t('monitoring:aggregate.clockedInLabel')}:{' '}
                <span className="font-mono font-bold tabular-nums">{hovered.clocked_in}</span>
              </span>
              <span>
                {t('monitoring:aggregate.notClockedInLabel')}:{' '}
                <span className="font-mono font-bold tabular-nums">{hovered.not_clocked_in}</span>
              </span>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
