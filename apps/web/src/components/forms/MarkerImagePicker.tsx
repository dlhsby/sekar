'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { MARKER_PRESETS, isCustomMarker } from '@/lib/constants/markerPresets';

const MAX_BYTES = 200 * 1024;
const ACCEPT = 'image/svg+xml,image/png,image/webp';

interface MarkerImagePickerProps {
  /** Stored marker: a preset path, a data-URI, or null (= use the default). */
  value: string | null;
  onChange: (value: string | null) => void;
  /** System default shown when `value` is null; "Reset" returns to it. */
  defaultUrl: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Marker picker (UAT): shows the CURRENT marker with a Change button; expanding
 * reveals the preseeded gallery + custom upload. Markers are mandatory — an
 * unset value falls back to `defaultUrl` (never empty), and "Reset to default"
 * returns to it. Uploads are read client-side into a size-capped data-URI and
 * stored directly in `marker_image_url`. Shared by role / team / geo forms.
 */
export function MarkerImagePicker({
  value,
  onChange,
  defaultUrl,
  disabled,
  label,
}: MarkerImagePickerProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const effective = value ?? defaultUrl;
  const usingDefault = value == null;
  const custom = isCustomMarker(value);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t('common:marker.tooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
      setOpen(false);
    };
    reader.onerror = () => toast.error(t('common:marker.readError'));
    reader.readAsDataURL(file);
  };

  const pick = (url: string | null) => {
    onChange(url);
    setOpen(false);
  };

  // Tiles stay white so transparent marker images render true to color; the
  // selected state is a primary ring, never a background fill (which would show
  // through a transparent PNG and tint the icon).
  const cell =
    'flex size-12 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60';
  const selectedCell =
    '-translate-y-0.5 shadow-nb-md ring-2 ring-nb-primary ring-offset-2 ring-offset-nb-white';

  return (
    <div className="space-y-2">
      <label className="block text-nb-body-sm font-semibold text-nb-black">
        {label ?? t('common:marker.label')}
      </label>

      {/* Current marker + Change */}
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- small local/data-uri marker */}
          <img src={effective} alt={t('common:marker.current')} className="size-9" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-nb-body-sm font-semibold text-nb-black">
            {custom ? t('common:marker.custom') : usingDefault ? t('common:marker.usingDefault') : t('common:marker.current')}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setOpen((o) => !o)}>
              {t('common:marker.change')}
            </Button>
            {!usingDefault && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                leftIcon={<RotateCcw className="size-4" />}
                onClick={() => pick(null)}
              >
                {t('common:marker.reset')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery (expanded) */}
      {open && (
        <div className="space-y-2 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Default option */}
            <button
              type="button"
              disabled={disabled}
              aria-pressed={usingDefault}
              title={t('common:marker.default')}
              aria-label={t('common:marker.default')}
              onClick={() => pick(null)}
              className={cn(cell, 'border-dashed', usingDefault ? selectedCell : 'shadow-nb-sm')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- default marker */}
              <img src={defaultUrl} alt="" className="size-8 opacity-80" />
            </button>

            {MARKER_PRESETS.map((preset, i) => {
              const selected = value === preset.url;
              return (
                <button
                  key={preset.url}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={t('common:marker.preset', { n: i + 1 })}
                  onClick={() => pick(preset.url)}
                  className={cn(cell, selected ? selectedCell : 'shadow-nb-sm')}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- preset marker */}
                  <img src={preset.url} alt="" className="size-8" />
                </button>
              );
            })}

            {/* Upload */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              title={t('common:marker.upload')}
              aria-label={t('common:marker.upload')}
              className={cn(cell, 'border-dashed', custom ? selectedCell : 'shadow-nb-sm')}
            >
              {custom ? (
                // eslint-disable-next-line @next/next/no-img-element -- custom marker preview
                <img src={value ?? ''} alt="" className="size-8" />
              ) : (
                <Upload className="size-5" aria-hidden />
              )}
            </button>
          </div>
          <p className="text-nb-caption text-nb-gray-600">{t('common:marker.hint')}</p>
        </div>
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
  );
}
