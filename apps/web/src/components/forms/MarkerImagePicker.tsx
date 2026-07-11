'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MARKER_PRESETS, isCustomMarker } from '@/lib/constants/markerPresets';

const MAX_BYTES = 200 * 1024;
const ACCEPT = 'image/svg+xml,image/png,image/webp';

interface MarkerImagePickerProps {
  /** Stored marker value: a preset path (`/markers/*.svg`) or a data-URI. */
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Marker picker (UAT): choose a preseeded image from the gallery or upload a
 * custom one. Uploads are read client-side into a base64 data-URI (kept small
 * via a size cap) and stored directly in the entity's `marker_image_url` — no
 * separate upload endpoint, mirroring the app's data-URI image convention.
 * Shared by role / team / rayon / region / area forms.
 */
export function MarkerImagePicker({ value, onChange, disabled, label }: MarkerImagePickerProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const custom = isCustomMarker(value);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t('common:marker.tooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => toast.error(t('common:marker.readError'));
    reader.readAsDataURL(file);
  };

  const cell =
    'flex size-12 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60';
  const selectedCell = '-translate-y-0.5 bg-nb-primary shadow-nb-md';

  return (
    <div className="space-y-2">
      <label className="block text-nb-body-sm font-semibold text-nb-black">
        {label ?? t('common:marker.label')}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {MARKER_PRESETS.map((preset, i) => {
          const selected = value === preset.url;
          return (
            <button
              key={preset.url}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={t('common:marker.preset', { n: i + 1 })}
              onClick={() => onChange(preset.url)}
              className={cn(cell, selected ? selectedCell : 'shadow-nb-sm')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny local svg marker */}
              <img src={preset.url} alt="" className="size-8" />
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          title={t('common:marker.upload')}
          aria-label={t('common:marker.upload')}
          className={cn(
            cell,
            'border-dashed',
            custom ? selectedCell : 'shadow-nb-sm',
          )}
        >
          {custom ? (
            // eslint-disable-next-line @next/next/no-img-element -- user data-uri marker preview
            <img src={value ?? ''} alt="" className="size-8" />
          ) : (
            <Upload className="size-5" aria-hidden />
          )}
        </button>

        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            title={t('common:marker.clear')}
            aria-label={t('common:marker.clear')}
            className={cn(cell, 'shadow-nb-sm')}
          >
            <X className="size-5" aria-hidden />
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-nb-caption text-nb-gray-600">{t('common:marker.hint')}</p>
    </div>
  );
}
