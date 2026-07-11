'use client';

import { Input } from '@/components/ui';

/** Matches a 6-digit hex colour (#RRGGBB). Shared by every colour input. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface ColorFieldProps {
  label: string;
  /** Current value (may be empty/partial while typing). */
  value: string;
  /** Swatch + placeholder shown when `value` isn't a valid hex yet. */
  fallback: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

/**
 * A hex-colour input: a native colour swatch paired with a free-text hex field.
 * Reused by the map-style fields (border/fill) and the role editor (accent).
 */
export function ColorField({ label, value, fallback, onChange, disabled }: ColorFieldProps) {
  const swatch = HEX_COLOR.test(value) ? value : fallback;
  return (
    <div className="space-y-1.5">
      <label className="block text-nb-body-sm font-semibold text-nb-black">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={swatch}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Input
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono"
        />
      </div>
    </div>
  );
}
