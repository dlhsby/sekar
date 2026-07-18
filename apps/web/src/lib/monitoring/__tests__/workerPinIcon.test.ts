/**
 * Unit tests: worker-pin glyph resolution. A worker pin draws the role's
 * configured `marker_icon` when set, else the built-in glyph for the field roles
 * (satgas/linmas/korlap), else the role's seeded default icon, else a generic
 * person — so custom roles and icon overrides show up on the monitoring map.
 */
import { workerPinIcon } from '../markers';

beforeAll(() => {
  (global as unknown as { google: unknown }).google = {
    maps: { Size: class {}, Point: class {} },
  };
});

const svgOf = (icon: google.maps.Icon) => decodeURIComponent((icon.url as string) ?? '');
const base = { activity: 'aktif' as const };

// Distinctive path fragments per glyph.
const SATGAS_HARDHAT = 'M4 17h16';
const CROWN = 'M2 18h20l-2-9';
const PERSON_FALLBACK = 'M6 19a6 6 0 0 1 12 0';

describe('workerPinIcon glyph resolution', () => {
  it('keeps the built-in glyph for a field role when no marker_icon is set', () => {
    expect(svgOf(workerPinIcon('satgas', base))).toContain(SATGAS_HARDHAT);
  });

  it("renders the role's explicitly-configured marker_icon over the built-in glyph", () => {
    const svg = svgOf(workerPinIcon('satgas', { ...base, markerIcon: 'crown' }));
    expect(svg).toContain(CROWN);
    expect(svg).not.toContain(SATGAS_HARDHAT);
  });

  it('falls back to the seeded default icon for a role with no built-in glyph', () => {
    // kepala_rayon has no bespoke glyph → its default marker icon is "crown".
    expect(svgOf(workerPinIcon('kepala_rayon', base))).toContain(CROWN);
  });

  it('renders a generic person for an unknown role + unknown icon', () => {
    const svg = svgOf(workerPinIcon('some_custom_role', { ...base, markerIcon: 'nope' }));
    expect(svg).toContain(PERSON_FALLBACK);
  });
});
