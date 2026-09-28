'use client';

import { Input } from '@/components/ui';

/** Matches a 6-digit hex colour (#RRGGBB). Shared by every colour input. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface ColorFieldProps {
  /** Visible label. Omit when the caller renders its own header (see the fill
   *  control) — pass `ariaLabel` instead so the inputs stay accessible. */
  label?: string;
  ariaLabel?: string;
  /** Current value (may be empty/partial while typing). */
  value: string;
  /** Swatch + placeholder shown when `value` isn't a valid hex yet. */
  fallback: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Validation message shown under the field (e.g. partial hex). */
  error?: string;
}

/**
 * A hex-colour input: a native colour swatch paired with a free-text hex field.
 * Reused by the map-style fields (border/fill) and the role editor (accent).
 */
export function ColorField({
  label,
  ariaLabel,
  value,
  fallback,
  onChange,
  disabled,
  error,
}: ColorFieldProps) {
  const swatch = HEX_COLOR.test(value) ? value : fallback;
  const a11y = label ?? ariaLabel;
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-nb-body-sm font-semibold text-nb-black">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={a11y}
          value={swatch}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Input
          value={value}
          placeholder={fallback}
          aria-label={label ? undefined : a11y}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          state={error ? 'error' : undefined}
          aria-invalid={error ? true : undefined}
          className="font-mono"
        />
      </div>
      {error && (
        <p role="alert" aria-live="polite" className="text-nb-body-sm text-nb-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
