/**
 * Node-marker gating — the pair of gates that decide whether a geo tier draws
 * its pins, mirroring web's `visibleNodeMarkers` (SimpleMonitoringMap).
 */
import {
  showsNodeMarker,
  showsNodeLabel,
  DEFAULT_VISIBLE_LAYERS,
  type GeoLayer,
} from '../layerVisibility';

describe('node-marker gate (parity with web visibleNodeMarkers)', () => {
  // Both gates must pass before a tier draws its pins. The marker facet is what
  // lets an operator quiet a dense tier — zoom mode draws every lokasi in the
  // city at once, and switching the tier's marker off is the way to tame it.
  const gate = (layer: GeoLayer, tierAdmitted: boolean) =>
    showsNodeMarker(layer) && tierAdmitted;

  it('draws a tier when its marker facet is on and the depth gate admits it', () => {
    expect(gate(['boundary', 'marker'], true)).toBe(true);
  });

  it('hides the pins when the operator turns the tier marker off', () => {
    expect(gate(['boundary', 'fill', 'label'], true)).toBe(false);
  });

  it('hides the pins when the depth gate has not admitted the tier', () => {
    expect(gate(['boundary', 'marker'], false)).toBe(false);
  });

  it('keeps the label facet independent of the marker facet', () => {
    // Label on, marker off: the operator wants the tier named, not pinned.
    expect(showsNodeLabel(['label'])).toBe(true);
    expect(showsNodeMarker(['label'])).toBe(false);
  });

  it('ships every geo tier marker-on by default, exactly as web does', () => {
    for (const tier of ['district', 'kawasan', 'lokasi'] as const) {
      expect(showsNodeMarker(DEFAULT_VISIBLE_LAYERS[tier])).toBe(true);
    }
  });
});
