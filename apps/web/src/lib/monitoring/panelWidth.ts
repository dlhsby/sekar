'use client';

/**
 * How wide the Wilayah/Petugas panel is, per operator.
 *
 * The panel was a fixed `w-96` (384 px). That is fine for "Rayon Pusat" and
 * cramped for "Kawasan Manukan Balongsari S.D Manukan", and which of those an
 * operator spends their day looking at is not something a stylesheet can know.
 * So it is theirs to set, and it persists — same storage class as the layer
 * facets, the hidden list and the map mode: a workspace preference, per browser,
 * never a data change.
 *
 * Desktop only. Below `sm` the panel spans the viewport with a margin either
 * side, where there is no width to give it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const PANEL_WIDTH_KEY = 'monitoring.panelWidth.v1';

/** The old fixed `sm:w-96`, kept as the default so nothing moves unasked. */
export const DEFAULT_PANEL_WIDTH = 384;

/** Narrow enough to still fit the roster chips without wrapping every row. */
export const MIN_PANEL_WIDTH = 300;

/** Beyond this the panel starts to be the page rather than a panel over the map. */
export const MAX_PANEL_WIDTH = 720;

export const clampPanelWidth = (px: number): number =>
  Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(px)));

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH;
  try {
    const raw = window.localStorage.getItem(PANEL_WIDTH_KEY);
    if (!raw) return DEFAULT_PANEL_WIDTH;
    const n = Number(raw);
    // Sanitised on read: this survives hand-edits and downgrades, and a bad
    // value must not collapse the panel to nothing.
    return Number.isFinite(n) ? clampPanelWidth(n) : DEFAULT_PANEL_WIDTH;
  } catch {
    return DEFAULT_PANEL_WIDTH;
  }
}

export interface PanelWidthApi {
  width: number;
  /** Live drag: clamped and applied, not yet written to storage. */
  setWidth: (px: number) => void;
  /** Drag finished — persist wherever it landed. */
  commit: () => void;
  /** Back to the default. Bound to a double-click on the handle. */
  reset: () => void;
}

export function usePanelWidth(): PanelWidthApi {
  const [width, setWidthState] = useState(DEFAULT_PANEL_WIDTH);
  /**
   * The live width, readable without re-subscribing.
   *
   * `commit` is called from a pointer handler registered when the drag STARTED,
   * so a `commit` that closed over `width` would persist whatever it was before
   * the drag — the panel resized on screen and the old width came back on
   * reload. The ref is what makes "save where it landed" mean the current value.
   */
  const widthRef = useRef(DEFAULT_PANEL_WIDTH);

  useEffect(() => {
    const stored = readStored();
    widthRef.current = stored;
    setWidthState(stored);
  }, []);

  const persist = useCallback((px: number) => {
    try {
      window.localStorage.setItem(PANEL_WIDTH_KEY, String(px));
    } catch {
      // A full or disabled localStorage costs the operator their preference,
      // never their panel.
    }
  }, []);

  // Storage is written on release, not on every pointer move: a drag across the
  // screen is hundreds of events, and localStorage is synchronous.
  const setWidth = useCallback((px: number) => {
    const next = clampPanelWidth(px);
    widthRef.current = next;
    setWidthState(next);
  }, []);
  const commit = useCallback(() => persist(widthRef.current), [persist]);
  const reset = useCallback(() => {
    widthRef.current = DEFAULT_PANEL_WIDTH;
    setWidthState(DEFAULT_PANEL_WIDTH);
    persist(DEFAULT_PANEL_WIDTH);
  }, [persist]);

  return { width, setWidth, commit, reset };
}
