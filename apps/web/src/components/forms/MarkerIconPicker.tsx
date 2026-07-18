'use client';

import { useTranslation } from 'react-i18next';
import {
  User,
  HardHat,
  Shield,
  Star,
  Database,
  Crown,
  Building2,
  Settings,
  Key,
  Droplets,
  Clipboard,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { cn, nbFocusRing } from '@/lib/utils/cn';

/**
 * The glyph names a worker pin can render (mirror `ICON_GLYPHS` in the monitoring
 * marker builder). Picking one sets a role's `marker_icon` — the shape drawn
 * inside the live-status-colored worker pin.
 */
const GLYPHS: { name: string; Icon: LucideIcon }[] = [
  { name: 'user', Icon: User },
  { name: 'hard-hat', Icon: HardHat },
  { name: 'shield', Icon: Shield },
  { name: 'star', Icon: Star },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'clipboard', Icon: Clipboard },
  { name: 'database', Icon: Database },
  { name: 'crown', Icon: Crown },
  { name: 'building', Icon: Building2 },
  { name: 'droplets', Icon: Droplets },
  { name: 'settings', Icon: Settings },
  { name: 'key', Icon: Key },
];

interface MarkerIconPickerProps {
  /** Current `marker_icon` glyph name; null → the role's seeded default. */
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Glyph picker for a role's map marker (ADR-044). A grid of the glyphs a worker
 * pin can show; the pin keeps its live-status fill (green active / amber offline)
 * — only the glyph is chosen here.
 */
export function MarkerIconPicker({ value, onChange, disabled }: MarkerIconPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label className="block text-nb-body-sm font-semibold text-nb-black">
        {t('access-control:fields.markerIcon')}
      </label>
      <p className="text-nb-caption text-nb-gray-500">{t('access-control:fields.markerIconHint')}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {GLYPHS.map(({ name, Icon }) => {
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={name}
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                'flex size-11 items-center justify-center rounded-nb-base border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-nb-black bg-nb-primary text-nb-white shadow-nb-xs'
                  : 'border-nb-black bg-nb-white text-nb-black hover:bg-nb-gray-100',
                nbFocusRing
              )}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
