'use client';

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
 *  3. **It is per-browser, not per-account** — the same storage as the layer
 *     facets, because it is a workspace preference and not a data change.
 *
 * A hidden node hides its own row and marker only; its children are unaffected,
 * because "I don't need to see Rayon Barat's pin" is not "I don't care about
 * anything in Rayon Barat". Hiding a whole subtree is what the layer facets and
 * the drill scope are for.
 */
import { useCallback, useEffect, useState } from 'react';

export interface HiddenEntities {
  /** Aggregate node ids (rayon / kawasan / lokasi). */
  nodes: string[];
  /** User ids. */
  workers: string[];
}

export const EMPTY_HIDDEN: HiddenEntities = { nodes: [], workers: [] };

const STORAGE_KEY = 'monitoring.hidden.v1';

export type HiddenKind = keyof HiddenEntities;

function readStored(): HiddenEntities {
  if (typeof window === 'undefined') return EMPTY_HIDDEN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_HIDDEN;
    const parsed = JSON.parse(raw) as Partial<HiddenEntities>;
    // Sanitised on read: this list is written by the UI but survives downgrades
    // and hand-edits, and a malformed entry must not break the map.
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes.filter((n) => typeof n === 'string') : [],
      workers: Array.isArray(parsed.workers)
        ? parsed.workers.filter((n) => typeof n === 'string')
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

export function useHiddenEntities(): UseHiddenEntities {
  const [hidden, setHidden] = useState<HiddenEntities>(EMPTY_HIDDEN);

  // Hydrate after mount so SSR and the first client render agree.
  useEffect(() => {
    setHidden(readStored());
  }, []);

  const persist = useCallback((next: HiddenEntities) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures (private mode, quota)
    }
    return next;
  }, []);

  const toggle = useCallback(
    (kind: HiddenKind, id: string) => {
      setHidden((prev) => {
        const list = prev[kind];
        const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        return persist({ ...prev, [kind]: next });
      });
    },
    [persist]
  );

  const clear = useCallback(
    (kind: HiddenKind) => setHidden((prev) => persist({ ...prev, [kind]: [] })),
    [persist]
  );

  const isHidden = useCallback(
    (kind: HiddenKind, id: string) => hidden[kind].includes(id),
    [hidden]
  );

  const count = useCallback((kind: HiddenKind) => hidden[kind].length, [hidden]);

  return { hidden, isHidden, toggle, clear, count };
}
