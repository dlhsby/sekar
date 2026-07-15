'use client';

import { useTranslation } from 'react-i18next';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { AreaBoundaryMap } from '@/components/maps/AreaBoundaryMapLazy';
import { useRayon } from '@/lib/api/rayons';
import { useRegion } from '@/lib/api/regions';
import { useLocation } from '@/lib/api/locations';
import type { AreaLevel } from '@/components/maps/AreaBoundaryMap';

export interface AreaMapSubject {
  level: AreaLevel;
  id: string;
  name: string;
}

interface AreaMapModalProps {
  subject: AreaMapSubject | null;
  onOpenChange: (open: boolean) => void;
}

const num = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

/**
 * The boundary of one rayon / kawasan / lokasi, opened from the day board.
 *
 * Fetched ON DEMAND (each hook is `enabled` only for the level actually asked
 * for) rather than threaded through `BoardMasterData`: the board holds ~9 rayons,
 * ~130 kawasan and ~800 lokasi, and carrying every polygon just so a button can
 * occasionally draw one would weigh down every board load for a rare action. The
 * map component itself is lazy too, so Google Maps never enters the board bundle.
 */
export function AreaMapModal({ subject, onOpenChange }: AreaMapModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const open = !!subject;
  const level = subject?.level;

  const rayon = useRayon(level === 'rayon' && subject ? subject.id : '');
  const region = useRegion(level === 'region' && subject ? subject.id : '', open);
  const location = useLocation(level === 'location' && subject ? subject.id : '', {
    enabled: open && level === 'location',
  });

  const entity =
    level === 'rayon' ? rayon.data : level === 'region' ? region.data : location.data;
  const isLoading =
    level === 'rayon' ? rayon.isLoading : level === 'region' ? region.isLoading : location.isLoading;

  // A rayon carries `center_*`; a lokasi carries `gps_*`. A kawasan has neither —
  // its outline is the whole answer.
  const lat = num(
    (entity as { center_lat?: number | string | null; gps_lat?: number | string | null })
      ?.center_lat ??
      (entity as { gps_lat?: number | string | null })?.gps_lat
  );
  const lng = num(
    (entity as { center_lng?: number | string | null; gps_lng?: number | string | null })
      ?.center_lng ??
      (entity as { gps_lng?: number | string | null })?.gps_lng
  );
  const pin = lat != null && lng != null ? { lat, lng } : null;
  const boundary = entity?.boundary_polygon ?? null;
  const hasGeometry = !!boundary || !!pin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{subject?.name}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <div className="h-[420px] w-full animate-pulse rounded-nb-base bg-nb-gray-100" />
          ) : !hasGeometry ? (
            <p className="rounded-nb-base border-2 border-dashed border-nb-black bg-nb-gray-50 py-10 text-center text-nb-body-sm text-nb-gray-500">
              {t('schedules:board.mapNoGeometry')}
            </p>
          ) : (
            <AreaBoundaryMap
              level={level!}
              boundary={boundary}
              pin={pin}
              borderColor={entity?.border_color}
              fillColor={entity?.fill_color}
              borderOpacity={entity?.border_opacity}
              fillOpacity={entity?.fill_opacity}
              mapsFallback={
                <p className="rounded-nb-base border-2 border-dashed border-nb-black bg-nb-gray-50 py-10 text-center text-nb-body-sm text-nb-gray-500">
                  {t('schedules:board.mapUnavailable')}
                </p>
              }
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
