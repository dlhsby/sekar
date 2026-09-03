/**
 * Stacking for the monitoring map's chrome — the search bar, the drill
 * breadcrumb and the FAB column.
 *
 * These sit above a map that can be carrying a thousand markers. Sibling paint
 * order alone put them on top only by accident of render order, and a marker's
 * own shadow (which Android resolves to an `elevation`) could out-rank a control
 * that declared none — leaving the tools button unreachable inside a dense tier,
 * exactly where an operator most needs it to thin the map out.
 *
 * `zIndex` covers iOS and the Fabric view order; `elevation` is what Android
 * actually compares when it decides who draws last. Both are set, deliberately,
 * so the chrome cannot fall behind the map's contents on either platform.
 */
export const MAP_CHROME_LAYER = {
  zIndex: 20,
  elevation: 20,
} as const;
