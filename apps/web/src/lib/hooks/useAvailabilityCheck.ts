import { useEffect, useRef, useState } from 'react';

/**
 * Live-availability state for a unique field (username, phone, rayon name, …).
 * `invalid` = failed the format predicate (no network call was made).
 */
export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export interface UseAvailabilityCheckOptions {
  /** Current (raw) field value. */
  value: string;
  /** Async availability check — resolves `true` when the value is AVAILABLE. */
  check: (value: string) => Promise<boolean>;
  /** Turn the check off entirely (e.g. read-only view). Default `true`. */
  enabled?: boolean;
  /** Normalize the raw value before validating + checking (e.g. phone). */
  normalize?: (value: string) => string;
  /** Below this length → `idle` (not `invalid`). Applied to the normalized value. */
  minLength?: number;
  /** Format predicate — `false` → `invalid` (skips the network call). */
  isValidFormat?: (value: string) => boolean;
  /** Value is unchanged (→ `idle`, skip check) — e.g. equals the saved value in edit mode. */
  isUnchanged?: (value: string) => boolean;
  /** Debounce before calling `check`. Default 400ms. */
  debounceMs?: number;
}

/**
 * Debounced uniqueness/availability check with a race guard (a slow response for
 * an older value can't overwrite the current one). Callbacks are read through a
 * ref so inline `check`/predicate closures don't reset the debounce every render.
 */
export function useAvailabilityCheck({
  value,
  check,
  enabled = true,
  normalize,
  minLength,
  isValidFormat,
  isUnchanged,
  debounceMs = 400,
}: UseAvailabilityCheckOptions): AvailabilityStatus {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const latestRef = useRef('');

  // Keep the latest callbacks in a ref (synced in an effect, not during render)
  // so inline `check`/predicate closures don't reset the debounce every render.
  const cbRef = useRef({ check, normalize, isValidFormat, isUnchanged });
  useEffect(() => {
    cbRef.current = { check, normalize, isValidFormat, isUnchanged };
  });

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    const { check, normalize, isValidFormat, isUnchanged } = cbRef.current;
    const raw = (value || '').trim();
    if (!raw) {
      setStatus('idle');
      return;
    }
    const v = normalize ? normalize(raw) : raw;
    if ((minLength && v.length < minLength) || isUnchanged?.(v)) {
      setStatus('idle');
      return;
    }
    if (isValidFormat && !isValidFormat(v)) {
      setStatus('invalid');
      return;
    }
    setStatus('checking');
    latestRef.current = v;
    const t = setTimeout(async () => {
      try {
        const available = await check(v);
        if (latestRef.current !== v) return; // a newer value is being checked
        setStatus(available ? 'available' : 'taken');
      } catch {
        if (latestRef.current === v) setStatus('idle');
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, enabled, minLength, debounceMs]);

  return status;
}
