'use client';

/**
 * NodeHoverPreview — what a map node is, shown on hover, before you commit to it.
 *
 * Parity W5. Mobile shows a preview card when a marker is TAPPED: a tap is
 * imprecise, and the map recenters first, so committing straight to a drill would
 * often drill the wrong thing. A mouse has neither problem, and web's click →
 * drill is already the shorter path — so the same information moves to hover
 * instead of becoming an extra click. The value parity was after is "see what
 * this is before you commit", not the step.
 *
 * Positioned from the CURSOR rather than the node's lat/lng: no projection, no
 * reflow on pan/zoom, and it lands where the eye already is.
 */

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import type { NodeMarker } from './NodeMarkerLayer';

/** Card footprint, used to flip the card away from the viewport edges. */
const CARD_W = 220;
const CARD_H = 132;
const GAP = 14;

export interface NodeHoverPreviewProps {
  node: NodeMarker | null;
  cursor: { x: number; y: number } | null;
}

export function NodeHoverPreview({ node, cursor }: NodeHoverPreviewProps) {
  const { t } = useTranslation(['monitoring']);
  if (!node || !cursor) return null;

  // Flip toward the inside of the viewport near an edge, so the card is never
  // clipped and never covers the pin it describes.
  const flipX = cursor.x + GAP + CARD_W > window.innerWidth;
  const flipY = cursor.y + GAP + CARD_H > window.innerHeight;
  const left = flipX ? cursor.x - GAP - CARD_W : cursor.x + GAP;
  const top = flipY ? cursor.y - GAP - CARD_H : cursor.y + GAP;

  const understaffed = node.scheduled > 0 && node.clocked_in < node.scheduled;

  const stat = (label: string, value: number, tone?: string) => (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase text-nb-gray-500">{label}</span>
      <span className={cn('text-sm font-black text-nb-black', tone)}>{value}</span>
    </div>
  );

  return (
    // pointer-events-none: the card must never become a hover target itself, or
    // it would sit under the cursor, fire mouseleave on the pin, and flicker.
    <div
      role="tooltip"
      data-testid="node-hover-preview"
      style={{ left, top, width: CARD_W }}
      className="pointer-events-none fixed z-50 rounded-nb-base border-2 border-nb-black bg-nb-white p-2 shadow-nb-md"
    >
      <p className="text-[10px] font-bold uppercase text-nb-gray-500">
        {t(`monitoring:areaDetail.${node.variant}`)}
      </p>
      <p className="truncate text-sm font-black text-nb-black" title={node.name}>
        {node.name}
      </p>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5 border-t-2 border-nb-gray-200 pt-1.5">
        {stat(t('monitoring:aggregate.scheduledLabel'), node.scheduled)}
        {stat(
          t('monitoring:aggregate.clockedInLabel'),
          node.clocked_in,
          understaffed ? 'text-nb-danger-dark' : undefined,
        )}
        {stat(t('monitoring:status.active'), node.active)}
      </div>

      <p className="mt-1.5 text-[10px] font-semibold text-nb-gray-600">
        {t('monitoring:hoverPreview.hint')}
      </p>
    </div>
  );
}
