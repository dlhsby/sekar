/**
 * PlantOverlayLayer Component — STUB
 * Phase 3 sub-phase 3-5: Placeholder for notable-plant markers.
 *
 * Full implementation ships in sub-phase 3-8 (Plants management feature).
 * When visible=false the component is a no-op; when visible=true it still
 * returns null (no markers rendered) until the implementation is added.
 *
 * Future contract:
 * - `satgas`/`linmas`: tap shows species + heritage notes, no edit.
 * - `korlap` and above: tap navigates to plant edit screen.
 */


// ─── Props ────────────────────────────────────────────────────────────────────

interface PlantOverlayLayerProps {
  visible: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

// TODO sub-phase 3-8: implement notable plant markers + CRUD for korlap+
export function PlantOverlayLayer({ visible }: PlantOverlayLayerProps): null {
  if (!visible) { return null; }
  // TODO: render notable_plant Markers reading from plants Redux slice
  return null;
}
