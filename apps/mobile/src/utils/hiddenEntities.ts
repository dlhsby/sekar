/**
 * Per-operator "don't show me this" lists for the monitoring map.
 *
 * The layer facets answer "which TIERS do I want"; this answers "which
 * particular rayon / kawasan / lokasi / person do I want out of the way". On a
 * real dataset the Wilayah tab is 371 rows and the map is a wall of pins, and
 * most of it is not what a given supervisor is watching today. Hiding by tier is
 * too blunt for that; hiding by row is the tool they actually asked for.
 *
 * Three rules make it safe to hide things on a monitoring map:
 *
 *  1. **Hiding is presentation, never accounting.** Every count — the header
 *     totals, a rayon's roster trio, the presence figures — is computed by the
 *     server over the full scope. A hidden lokasi is still counted inside its
 *     rayon. A map where hiding a row changed the numbers would be a map that
 *     lies on request.
 *  2. **It is always visible that something is hidden**, with a one-click way
 *     back. A silent filter is how an operator ends up staring at an incomplete
 *     map believing it is complete.
 *  3. **It is per-device, not per-account** — a workspace preference, not a
 *     data change, so it lives in `AsyncStorage` beside the other preferences
 *     rather than travelling with the user.
 *
 * A hidden node hides its own row and marker only; its children are unaffected,
 * because "I don't need to see Rayon Barat's pin" is not "I don't care about
 * anything in Rayon Barat". Hiding a whole subtree is what the layer facets and
 * the drill scope are for.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HiddenEntities {
  /** Aggregate node ids (rayon / kawasan / lokasi). */
  nodes: string[];
  /** User ids. */
  workers: string[];
}

export const EMPTY_HIDDEN: HiddenEntities = { nodes: [], workers: [] };

const STORAGE_KEY = 'monitoring.hidden.v1';

export type HiddenKind = keyof HiddenEntities;

/**
 * Parse a stored payload, sanitising as it goes.
 *
 * Exported because it is the part of the read path worth testing directly: the
 * list survives downgrades and can be hand-edited on a rooted device, and one
 * malformed entry must not break the sheet.
 */
export function parseHidden(raw: string | null): HiddenEntities {
  if (!raw) return EMPTY_HIDDEN;
  try {
    const parsed = JSON.parse(raw) as Partial<HiddenEntities>;
    return {
      nodes: Array.isArray(parsed.nodes)
        ? parsed.nodes.filter((n): n is string => typeof n === 'string')
        : [],
      workers: Array.isArray(parsed.workers)
        ? parsed.workers.filter((n): n is string => typeof n === 'string')
        : [],
    };
  } catch {
    return EMPTY_HIDDEN;
  }
}

export interface UseHiddenEntities {
  hidden: HiddenEntities;
  /** Membership tests, as Sets, so list rendering stays O(1) per row. */
  isHidden: (kind: HiddenKind, id: string) => boolean;
  toggle: (kind: HiddenKind, id: string) => void;
  /** Restore everything of one kind — the way back from rule 2. */
  clear: (kind: HiddenKind) => void;
  count: (kind: HiddenKind) => number;
}

/**
 * The hide list for this device.
 *
 * Loaded once on mount, written fire-and-forget on change. The live list rides
 * a ref as well as state so a toggle fired from a row callback reads the CURRENT
 * list rather than the one captured when that callback was created — otherwise
 * hiding two rows quickly would lose the first.
 */
export function useHiddenEntities(): UseHiddenEntities {
  const [hidden, setHidden] = useState<HiddenEntities>(EMPTY_HIDDEN);
  const ref = useRef<HiddenEntities>(EMPTY_HIDDEN);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!active) return;
        const loaded = parseHidden(raw);
        ref.current = loaded;
        setHidden(loaded);
      })
      .catch(() => {
        // A device that cannot read its preferences still gets a full list,
        // which is the safe direction to fail in: nothing is hidden.
      });
    return () => {
      active = false;
    };
  }, []);

  const write = useCallback((next: HiddenEntities) => {
    ref.current = next;
    setHidden(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Best-effort; the in-memory list is already updated.
    });
  }, []);

  const toggle = useCallback(
    (kind: HiddenKind, id: string) => {
      const current = ref.current[kind];
      const next = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id];
      write({ ...ref.current, [kind]: next });
    },
    [write],
  );

  const clear = useCallback(
    (kind: HiddenKind) => write({ ...ref.current, [kind]: [] }),
    [write],
  );

  /** How many of this kind are hidden — the restore banner's number. */
  const count = useCallback((kind: HiddenKind) => hidden[kind].length, [hidden]);

  const isHidden = useCallback(
    (kind: HiddenKind, id: string) => hidden[kind].includes(id),
    [hidden],
  );

  return { hidden, isHidden, toggle, clear, count };
}
