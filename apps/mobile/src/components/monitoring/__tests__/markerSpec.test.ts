/**
 * markerSpec — the unified node pin (ADR-051).
 *
 * These assert the SVG *contract* rather than the rendered pixels, because the
 * markup is the thing that has to stay identical to web's `pinSvg`
 * (apps/web/src/lib/monitoring/markers.ts). A component test cannot see inside
 * an `SvgXml`, so the geometry is verified here and the layer test below only
 * checks which of the two forms was chosen.
 */
import { nodePinSvg, nodeGlyphFor, healthColor, rosterHealth } from '../markerSpec';

describe('nodePinSvg', () => {
  it('draws the teardrop with the health ring as the outline', () => {
    const { svg } = nodePinSvg(nodeGlyphFor('district', null), {
      outline: '#1C1917',
      badgeColor: healthColor('ok'),
      count: 3,
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 48 60"');
    expect(svg).toContain('stroke="#1C1917"');
  });

  it('renders the count badge only when the count is above zero', () => {
    const withCount = nodePinSvg(null, { outline: '#1C1917', count: 7 }).svg;
    // The badge circle sits at the pin's top-right; the number is its text node.
    expect(withCount).toContain('>7<');

    const empty = nodePinSvg(null, { outline: '#1C1917', count: 0 }).svg;
    expect(empty).not.toContain('<text');
  });

  it('sizes district and region pins bigger than a lokasi', () => {
    const big = nodePinSvg(null, { outline: '#1C1917', big: true });
    const small = nodePinSvg(null, { outline: '#1C1917' });
    expect(big.w).toBe(46);
    expect(small.w).toBe(38);
    // Height keeps web's 1.25 aspect so the anchor maths matches.
    expect(big.h).toBe(Math.round(46 * 1.25));
  });

  it('gives each geo tier a distinct default glyph', () => {
    const district = nodeGlyphFor('district', null);
    const region = nodeGlyphFor('region', null);
    const location = nodeGlyphFor('location', null);
    expect(district).toBeTruthy();
    expect(new Set([district, region, location]).size).toBe(3);
  });

  it("prefers the location's configured marker_icon over the tier default", () => {
    expect(nodeGlyphFor('location', 'building')).toBe(nodeGlyphFor('district', null));
  });

  it('falls back to the tier default for an unknown icon name', () => {
    expect(nodeGlyphFor('region', 'not-a-real-icon')).toBe(nodeGlyphFor('region', null));
  });
});

describe('rosterHealth', () => {
  it('reads empty when nothing is scheduled', () => {
    expect(rosterHealth(0, 0)).toBe('empty');
  });

  it('reads none when nobody has clocked in', () => {
    expect(rosterHealth(4, 0)).toBe('none');
  });

  it('reads short when only some have clocked in', () => {
    expect(rosterHealth(4, 2)).toBe('short');
  });

  it('reads ok when the roster is met', () => {
    expect(rosterHealth(4, 4)).toBe('ok');
  });
});
