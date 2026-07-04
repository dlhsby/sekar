'use client';

/**
 * AggregateBubbleLayer — renders one summary "bubble" per aggregate node (a
 * rayon at city scope, or an area at rayon scope). Each bubble shows the online
 * worker count, sized by headcount and tinted danger when understaffed. Clicking
 * a bubble drills one level deeper. This is the light, default "Ringkasan" view
 * that keeps the map fast city-wide — no per-worker markers.
 */
import { useMemo, useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import type { AggregateNode } from '@/lib/api/monitoring-v2';

/* eslint-disable sekar-design/no-inline-hex-colors -- Google overlay options, not rendered style tokens */
const BLACK = '#1C1917';
const WHITE = '#FFFFFF';
const OK = '#15803D';
const UNDERSTAFFED = '#DC2626';
/* eslint-enable sekar-design/no-inline-hex-colors */

export interface AggregateBubbleLayerProps {
  nodes: AggregateNode[];
  onDrill?: (node: AggregateNode) => void;
}

/** Bubble radius scales gently with online headcount so big nodes read bigger. */
function bubbleScale(onlineCount: number): number {
  return Math.min(26, 12 + Math.sqrt(onlineCount) * 2.5);
}

export function AggregateBubbleLayer({ nodes, onDrill }: AggregateBubbleLayerProps) {
  const { t } = useTranslation();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const placed = useMemo(
    () =>
      nodes.filter(
        (n) => typeof n.center_lat === 'number' && typeof n.center_lng === 'number'
      ),
    [nodes]
  );

  const hovered = hoverId ? placed.find((n) => n.id === hoverId) : null;

  return (
    <>
      {placed.map((node) => {
        const online = node.online_count;
        return (
          <Marker
            key={`agg-${node.id}`}
            position={{ lat: node.center_lat as number, lng: node.center_lng as number }}
            onClick={() => onDrill?.(node)}
            onMouseOver={() => setHoverId(node.id)}
            onMouseOut={() => setHoverId((cur) => (cur === node.id ? null : cur))}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: bubbleScale(online),
              fillColor: node.is_understaffed ? UNDERSTAFFED : OK,
              fillOpacity: 0.9,
              strokeColor: BLACK,
              strokeWeight: 2,
            }}
            label={{
              text: String(online),
              color: WHITE,
              fontSize: '12px',
              fontWeight: '700',
            }}
            zIndex={5}
          />
        );
      })}

      {hovered && (
        <InfoWindow
          position={{ lat: hovered.center_lat as number, lng: hovered.center_lng as number }}
          onCloseClick={() => setHoverId(null)}
          options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -12) }}
        >
          <div className="text-xs text-nb-black">
            <div className="font-bold">{hovered.name}</div>
            <div className="mt-0.5">
              {t('monitoring:aggregate.onlineOfRequired', {
                online: hovered.online_count,
                required: hovered.required,
              })}
            </div>
            {hovered.is_understaffed && (
              <div className="font-semibold text-nb-danger-dark">
                {t('monitoring:aggregate.understaffed')}
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
