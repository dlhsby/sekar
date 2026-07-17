/**
 * Unit tests: NodeMarkerLayer bubble ratio. Guards the wiring that the drill
 * bubble renders the attendance ratio `clocked_in / scheduled` (hadir/terjadwal)
 * — NOT `active_inside` (a regression that made staffed areas render as
 * understaffed because offline/outside-area workers dropped out of the numerator).
 */
import { render } from '@testing-library/react';
import { NodeMarkerLayer, type NodeMarker } from '../NodeMarkerLayer';

const mockIcons: Array<{ url: string }> = [];
jest.mock('@react-google-maps/api', () => ({
  Marker: ({ icon, onClick }: { icon: { url: string }; onClick?: () => void }) => {
    mockIcons.push(icon);
    return <button data-testid="marker" onClick={() => onClick?.()} />;
  },
  InfoWindow: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeAll(() => {
  (global as unknown as { google: unknown }).google = {
    maps: { Size: class {}, Point: class {} },
  };
});

beforeEach(() => {
  mockIcons.length = 0;
});

const makeNode = (over: Partial<NodeMarker>): NodeMarker => ({
  id: 'n1',
  name: 'Rayon X',
  variant: 'rayon',
  lat: -7.2,
  lng: 112.7,
  scheduled: 2,
  clocked_in: 2,
  not_clocked_in: 0,
  active_inside: 1,
  ...over,
});

const iconSvg = () => decodeURIComponent(mockIcons[0].url);

describe('NodeMarkerLayer bubble ratio', () => {
  it('renders clocked_in / scheduled (hadir/terjadwal), not active_inside', () => {
    // Both workers present (clocked in) but only 1 active-and-inside.
    render(<NodeMarkerLayer nodes={[makeNode({ clocked_in: 2, scheduled: 2, active_inside: 1 })]} />);
    const svg = iconSvg();
    expect(svg).toContain('>2/2<'); // clocked_in / scheduled
    expect(svg).not.toContain('>1/2<'); // the old active_inside / scheduled bug
  });

  it('shows a fully-attended area as scheduled==clocked_in even when workers are offline/outside', () => {
    // A satgas clocked in but offline (GPS dropped) still counts as present.
    render(<NodeMarkerLayer nodes={[makeNode({ clocked_in: 3, scheduled: 3, active_inside: 0 })]} />);
    expect(iconSvg()).toContain('>3/3<');
  });

  it('shows a genuinely understaffed area as clocked_in below scheduled', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ clocked_in: 1, scheduled: 3, active_inside: 1 })]} />);
    expect(iconSvg()).toContain('>1/3<');
  });
});
