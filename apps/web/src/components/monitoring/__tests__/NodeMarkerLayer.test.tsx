/**
 * Unit tests: NodeMarkerLayer node markers (ADR-051). Each district/kawasan/lokasi
 * renders ONE unified pin — a code-drawn teardrop filled with the area's identity
 * color, its glyph, a staffing-health outline + active-count badge — the same
 * builder the editor uses. Empty lokasi draw their glyph pin (no muted dot).
 *
 * Rendered on AdvancedMarkerElement: the pin SVG + name label live in the marker's
 * `content` DOM element, which these tests inspect (was: a legacy `Marker` icon URL).
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures for marker fill colors, not UI tokens */
import { render } from '@testing-library/react';
import { NodeMarkerLayer, type NodeMarker } from '../NodeMarkerLayer';
import { HEALTH_COLORS, MARKER_NEUTRAL_OUTLINE } from '@/lib/monitoring/markers';

interface CapturedMarker {
  content: HTMLElement;
  onClick?: () => void;
  zIndex?: number;
  title?: string;
}
const markers: CapturedMarker[] = [];
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: (p: CapturedMarker) => {
    markers.push(p);
    return <button data-testid="marker" onClick={() => p.onClick?.()} />;
  },
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

beforeEach(() => {
  markers.length = 0;
});

const makeNode = (over: Partial<NodeMarker>): NodeMarker => ({
  id: 'n1',
  name: 'Rayon X',
  variant: 'district',
  lat: -7.2,
  lng: 112.7,
  scheduled: 2,
  clocked_in: 2,
  belum_hadir: 0, tidak_hadir: 0,
  active: 2,
  active_inside: 1,
  ...over,
});

// The pin SVG lives inside the marker's content element.
const svg = (i = 0) => markers[i].content.innerHTML;
const labelEl = (i = 0) => markers[i].content.querySelector('.am-label') as HTMLElement | null;
const labelText = (i = 0) => labelEl(i)?.textContent ?? undefined;
const opacity = (i = 0) => markers[i].content.style.opacity;
// Normalize an expected color through jsdom's CSSOM so the comparison is agnostic
// to whether it stores hex or rgb().
const asCss = (color: string) => {
  const d = document.createElement('div');
  d.style.color = color;
  return d.style.color;
};

describe('NodeMarkerLayer unified pin', () => {
  it('draws a white pin whose glyph identifies the type (district → building)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'district' })]} />);
    const s = svg();
    expect(s).toContain('#FFFFFF'); // fill is white for all area types
    expect(s).toContain('M6 22V4'); // building glyph identifies district
  });

  it('keeps the ring NEUTRAL (identity = fill_color) with staffing health on the badge', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2, active: 2 })]} />);
    const s = svg();
    expect(s).toContain(`stroke="${MARKER_NEUTRAL_OUTLINE}"`); // ring is neutral, not health/border
    expect(s).not.toContain(`stroke="${HEALTH_COLORS.ok}"`); // health never rides the ring
    expect(s).toContain(HEALTH_COLORS.ok); // health lives on the count badge instead
  });

  it('draws the configured glyph over the default (marker_icon = star)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ marker_icon: 'star', fill_color: '#9333EA' })]} />);
    expect(svg()).toContain('M12 2.5l2.9'); // star path fragment
  });

  it('rides the active count on a health-colored badge', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ active: 3, scheduled: 4, clocked_in: 4 })]} />);
    const s = svg();
    expect(s).toContain('>3<'); // count badge
    expect(s).toContain(HEALTH_COLORS.ok); // badge/outline health color (fully attended)
  });

  it('signals "nobody clocked in" via the health-tinted name label (ring stays neutral)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 3, clocked_in: 0, active: 0 })]} />);
    // No active count → no badge; the neutral ring carries no health color, so the
    // understaffed (none) signal reads from the health-tinted name label.
    expect(svg()).toContain(`stroke="${MARKER_NEUTRAL_OUTLINE}"`);
    expect(labelEl()?.style.color).toBe(asCss(HEALTH_COLORS.none));
  });

  it('labels the node with its name, colored by staffing health', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2 })]} />);
    expect(labelText()).toBe('Rayon X');
    expect(labelEl()?.style.color).toBe(asCss(HEALTH_COLORS.ok));
  });

  it('dims non-matching nodes when a geo filter spotlights one (labels stay)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ id: 'r1', name: 'Match' }), makeNode({ id: 'r2', name: 'Other' })]}
        activeGeoId="r1"
      />
    );
    expect([opacity(0), opacity(1)]).toEqual(['1', '0.3']); // match full, other dimmed
    // Every node keeps its name label (dimming only lowers the container opacity).
    expect(labelText(0)).toBe('Match');
    expect(labelText(1)).toBe('Other');
  });

  it('keeps every node at full opacity when no geo filter is set', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ id: 'r1' }), makeNode({ id: 'r2' })]} />);
    expect([opacity(0), opacity(1)]).toEqual(['1', '1']);
  });

  it('labels kawasan at every zoom, like district', () => {
    const kawasan = makeNode({ variant: 'region', name: 'Kawasan Mulyosari', active: 1 });
    const { rerender } = render(<NodeMarkerLayer nodes={[kawasan]} zoom={13} />);
    expect(labelText()).toBe('Kawasan Mulyosari');
    markers.length = 0;
    rerender(<NodeMarkerLayer nodes={[kawasan]} zoom={15} />);
    expect(labelText()).toBe('Kawasan Mulyosari');
  });

  it('renders an empty lokasi as its glyph pin (no white-dot fallback) with a label', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'location', name: 'Taman Kosong', scheduled: 0, clocked_in: 0, active: 0 })]}
        zoom={16}
      />
    );
    // The unified teardrop pin, not the old 12px muted dot.
    expect(svg()).toContain('M24 2C12.4 2');
    expect(svg()).not.toContain('width="12"');
    expect(labelText()).toBe('Taman Kosong');
  });

  it('renders a custom-glyph location even when empty (not a muted dot)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'location', scheduled: 0, active: 0, marker_icon: 'star' })]}
        zoom={16}
      />
    );
    expect(svg()).toContain('M12 2.5l2.9'); // star, not a dot
  });

  // ── Label placement + the label facet ───────────────────────────────────────

  it('puts each tier\'s name on its own side of the pin', () => {
    // One side per tier so a lokasi inside a kawasan inside a rayon does not
    // print three names on the same strip of map.
    for (const [variant, placement] of [
      ['district', 'bottom'],
      ['region', 'left'],
      ['location', 'right'],
    ] as const) {
      render(<NodeMarkerLayer nodes={[makeNode({ variant })]} />);
      const lab = labelEl(markers.length - 1)!;
      expect(lab.className).toContain(`am-label--${placement}`);
    }
  });

  it('omits the label when the tier\'s label facet is off, keeping the pin', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'location' })]}
        showLabels={{ location: false }}
      />
    );
    expect(labelEl()).toBeNull();
    // The pin itself is untouched — hiding names is not hiding the tier.
    expect(svg()).toContain('svg');
  });

  it('draws the label by default, so an unspecified tier is unchanged', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'district', name: 'Rayon Pusat' })]} />);
    expect(labelText()).toBe('Rayon Pusat');
  });

  it('draws a WHITE pin body even when the area carries its own fill colour', () => {
    // Node pins used to take the area's fill_color, which put the map's loudest
    // colour on its most repeated element — the pins competed with the polygons
    // wearing the same colours. Colour on a geo pin now means STATUS (the health
    // badge); area identity is carried by the boundary.
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'location', fill_color: '#FF00FF', fill_opacity: 0.9 })]}
      />
    );
    expect(svg()).toContain('#FFFFFF');
    expect(svg()).not.toContain('#FF00FF');
  });
});

describe('progressive reveal (viewport mode)', () => {
  it('draws every node in full when no promoted set is given', () => {
    // Drill and zoom mode. The absence of a set must mean "no budget", never
    // "budget of zero" — that inversion would blank the map in two modes this
    // feature is not supposed to touch.
    render(
      <NodeMarkerLayer nodes={[makeNode({ id: 'a' }), makeNode({ id: 'b', lat: -7.3 })]} />
    );
    expect(markers).toHaveLength(2);
    markers.forEach((m) => expect(m.content.querySelector('svg')).toBeTruthy());
  });

  it('renders a demoted node as a dot, not a pin', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ id: 'winner' }), makeNode({ id: 'loser', lat: -7.3 })]}
        promoted={new Set(['winner'])}
      />
    );
    const [winner, loser] = markers;
    expect(winner.content.querySelector('svg')).toBeTruthy();
    expect(loser.content.classList.contains('marker-dot')).toBe(true);
    expect(loser.content.querySelector('svg')).toBeNull();
  });

  it('keeps a demoted node clickable, so nothing is unreachable', () => {
    // The rule this map runs on: presentation may de-emphasise, never hide. A
    // dot that could not be opened would be exactly the clustering behaviour
    // that was removed for hiding people.
    const onDrill = jest.fn();
    render(
      <NodeMarkerLayer nodes={[makeNode({ id: 'dot' })]} promoted={new Set()} onDrill={onDrill} />
    );
    markers[0].onClick?.();
    expect(onDrill).toHaveBeenCalledWith(expect.objectContaining({ id: 'dot' }));
  });

  it('colours the dot by staffing health, so a red dot still means trouble', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ id: 'outage', scheduled: 5, clocked_in: 0 })]}
        promoted={new Set()}
      />
    );
    expect(markers[0].content.style.background).toBeTruthy();
    // `none` = rostered, nobody clocked in.
    const expected = HEALTH_COLORS.none.toLowerCase();
    const actual = markers[0].content.style.background;
    // jsdom normalises hex to rgb(); compare on the parsed channels.
    const hex = (c: string) =>
      `#${c
        .replace(/[^\d,]/g, '')
        .split(',')
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('')}`;
    expect(hex(actual)).toBe(expected);
  });

  it('draws demoted nodes beneath promoted ones', () => {
    // A dot overlapping a full pin must never take its click target.
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ id: 'up' }), makeNode({ id: 'down', lat: -7.3 })]}
        promoted={new Set(['up'])}
      />
    );
    const [up, down] = markers;
    expect(down.zIndex!).toBeLessThan(up.zIndex!);
  });
});

describe('the pin carries one action and one number', () => {
  it('draws the active count and no action button on top of it', () => {
    // Regression guard. A ⓘ detail button used to be appended at `top:-4px;
    // right:-6px` — the same corner the SVG draws the count badge in — so the
    // staffing number was sitting under a button. That corner is the count's:
    // it is the only live number the marker carries, and it is display only.
    render(<NodeMarkerLayer nodes={[makeNode({ active: 7 })]} onDrill={jest.fn()} />);
    const content = markers[0].content;

    expect(content.textContent).toContain('7');
    expect(content.querySelector('button')).toBeNull();
  });

  it('drills from the pin body, with nothing else competing for the tap', () => {
    const onDrill = jest.fn();
    render(<NodeMarkerLayer nodes={[makeNode({ id: 'n9' })]} onDrill={onDrill} />);
    markers[0].onClick?.();
    expect(onDrill).toHaveBeenCalledTimes(1);
  });
});
