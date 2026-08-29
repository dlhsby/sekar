'use client';

/**
 * Notable-plant pins — the heritage and specimen trees inside a lokasi.
 *
 * **Lokasi scope only, deliberately.** The API is per-location
 * (`GET /locations/:id/notable-plants`), so drawing these city-wide would be one
 * request per lokasi — roughly 950 of them. Narrowing to the drilled lokasi
 * costs one request and matches the map's own logic anyway: a tree is the
 * densest thing on it, and the tier rules already reveal the densest layer last.
 *
 * A heritage tree gets a heavier ring than an ordinary specimen, because that is
 * the distinction an operator is scanning for — the rest is in the callout.
 */
import { useMemo } from 'react';
import { AdvancedPinMarker } from './AdvancedPinMarker';
import { pinElement, MARKER_NEUTRAL_OUTLINE } from '@/lib/monitoring/markers';
import type { NotablePlantRow } from '@/lib/api/plants';

/** Heritage trees ring in the warning tone; ordinary specimens stay neutral. */
const HERITAGE_RING = 'var(--color-nb-warning)';

/**
 * Coerce a coordinate, treating "absent" as unusable rather than as zero.
 *
 * `Number(null)` is 0, not NaN — so a plant recorded without a fix sails
 * through a bare `Number.isFinite` guard and pins at (0, 0), in the Atlantic.
 * This exact trap was already fixed once in `useGeoIndex`; it is written out
 * here so the next person does not have to rediscover it.
 */
const coord = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export interface PlantMarkerLayerProps {
  plants: NotablePlantRow[];
  onSelect?: (plant: NotablePlantRow) => void;
}

export function PlantMarkerLayer({ plants, onSelect }: PlantMarkerLayerProps) {
  const placed = useMemo(
    () =>
      plants.filter((p) => !Number.isNaN(coord(p.gpsLat)) && !Number.isNaN(coord(p.gpsLng))),
    [plants],
  );

  return (
    <>
      {placed.map((plant) => {
        const name = plant.label ?? plant.species?.nameId ?? '';
        // Signature covers everything the pin's look depends on, so a refetch
        // that changes nothing visual reuses the element instead of rebuilding.
        const signature = `plant|${plant.heritage ? 1 : 0}|${name}`;
        return (
          <AdvancedPinMarker
            key={`plant-${plant.id}`}
            position={{ lat: coord(plant.gpsLat), lng: coord(plant.gpsLng) }}
            signature={signature}
            build={() =>
              pinElement('trees', {
                outline: plant.heritage ? HERITAGE_RING : MARKER_NEUTRAL_OUTLINE,
              })
            }
            onClick={() => onSelect?.(plant)}
            title={name}
            zIndex={3}
          />
        );
      })}
    </>
  );
}
