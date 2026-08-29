'use client';

/**
 * PhotoLightbox — a fullscreen viewer for verification/report photos.
 *
 * Extracted from the pruning-request detail page, which had the only copy. The
 * monitoring panel needed the same thing, and a second inline `useState` +
 * `Dialog` pair is how two viewers drift apart.
 *
 * Controlled by `index` rather than a boolean `open`, because the caller already
 * knows WHICH photo was clicked and a separate open flag would let the two
 * disagree. `null` closes it.
 *
 * Navigation appears only when there is more than one photo — a single-photo
 * caller (every current monitoring activity) gets the plain dialog it had.
 */

import { useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

export interface PhotoLightboxProps {
  /** Every photo in the set the clicked one belongs to. */
  photos: string[];
  /** Index being shown; `null` means closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Accessible name for the image. Falls back to a generic label. */
  alt?: string;
}

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  alt,
}: PhotoLightboxProps) {
  const { t } = useTranslation(['common']);
  const isOpen = index != null && index >= 0 && index < photos.length;
  const multiple = photos.length > 1;

  // Wrap around: at the last photo, "next" returns to the first. With only a
  // handful of photos, a dead-end button is more annoying than a cycle.
  const step = useCallback(
    (delta: number) => {
      if (index == null || photos.length === 0) return;
      onIndexChange((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  // Arrow keys are what people reach for in a photo viewer. Escape is already
  // handled by the underlying Dialog.
  useEffect(() => {
    if (!isOpen || !multiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, multiple, step]);

  const navButton =
    'absolute top-1/2 -translate-y-1/2 rounded-nb-base border-2 border-nb-black bg-white p-1.5 ' +
    'text-nb-black shadow-nb-sm transition-colors hover:bg-nb-gray-100 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogContent className="max-w-2xl p-2">
        {isOpen && (
          <div className="relative">
            <Image
              // Keying on the URL forces a fresh element per photo, so stepping
              // never shows the previous image while the next one decodes.
              key={photos[index]}
              src={photos[index]}
              alt={alt ?? t('common:ui.photoPreview')}
              width={1024}
              height={768}
              // S3/MinIO hosts are not in the Next image allowlist, and these are
              // already-sized uploads — optimizing them buys nothing.
              unoptimized
              className="h-auto w-full rounded-nb-base object-contain"
            />
            {multiple && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className={cn(navButton, 'left-2')}
                  aria-label={t('common:ui.photoPrevious')}
                  data-testid="lightbox-prev"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className={cn(navButton, 'right-2')}
                  aria-label={t('common:ui.photoNext')}
                  data-testid="lightbox-next"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-nb-base border-2 border-nb-black bg-white px-2 py-0.5 text-xs font-bold shadow-nb-sm"
                  data-testid="lightbox-counter"
                >
                  {index + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
