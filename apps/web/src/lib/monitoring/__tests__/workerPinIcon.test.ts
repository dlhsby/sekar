/**
 * Unit tests: worker-pin glyph resolution. A worker pin draws the role's
 * configured `marker_icon` when set, else the built-in glyph for the field roles
 * (satgas/linmas/korlap), else the role's seeded default icon, else a generic
 * person — so custom roles and icon overrides show up on the monitoring map.
 */
/* eslint-disable sekar-design/no-inline-hex-colors --
 * ADR-036 forbids inline hex so STYLING resolves through the design tokens.
 * Nothing here is styling: `#1D4ED8` is stand-in DATA for a colour an operator
 * picked in role settings, and `#FFFFFF` is the literal fallback the pin
 * builder emits when a role has none. Asserting against a token would test the
 * token pipeline rather than the pin, and would keep passing if the colour
 * stopped reaching the marker at all - which is the exact defect these tests
 * exist to catch, and which shipped twice.
 */
import { workerPinIcon, workerPinElement } from '../markers';

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

describe('workerPinElement colouring', () => {
  const svgHtml = (el: HTMLElement) => el.innerHTML;

  it("fills the pin with the ROLE's configured marker colour", () => {
    // The colour was configurable in role settings and changed nothing on the
    // map: the DTO carried the glyph but dropped the colour, so every worker pin
    // rendered white.
    const el = workerPinElement('satgas', {
      activity: 'aktif',
      markerColor: '#1D4ED8',
    });
    expect(svgHtml(el)).toContain('#1D4ED8');
  });

  it('falls back to white when the role has no colour set', () => {
    const el = workerPinElement('satgas', { activity: 'aktif' });
    expect(svgHtml(el)).toContain('#FFFFFF');
  });

  it('keeps STATUS on the ring, so identity and status never share a colour', () => {
    // Body = who this is, ring = how they are. Collapsing the two is what makes
    // a monitoring pin unreadable at a glance.
    const el = workerPinElement('satgas', {
      activity: 'aktif',
      markerColor: '#1D4ED8',
      lifecycleState: 'bertugas',
    });
    const html = svgHtml(el);
    expect(html).toContain('#1D4ED8');
    // The ring stroke is a different colour from the body fill.
    expect(html).toMatch(/stroke="(?!#1D4ED8)/);
  });
});
