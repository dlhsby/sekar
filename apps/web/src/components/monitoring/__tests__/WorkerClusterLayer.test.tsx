/**
 * Unit tests: WorkerClusterLayer. Every worker renders as an individual
 * AdvancedMarker pin (no clustering); ≥2-member teams collapse into one team
 * marker that opens its member list on click. Pin SVG + name label live in the
 * marker's `content` element; clicks fire onSelect / onTeamClick.
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures for team colors, not UI tokens */
import { render, fireEvent } from '@testing-library/react';
import { WorkerClusterLayer } from '../WorkerClusterLayer';
import type { SimpleWorker } from '../SimpleMonitoringMap';

interface CapturedMarker {
  content: HTMLElement;
  onClick?: () => void;
  title?: string;
  zIndex?: number;
}
const markers: CapturedMarker[] = [];
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: (p: CapturedMarker) => {
    markers.push(p);
    return <button data-testid="marker" title={p.title} onClick={() => p.onClick?.()} />;
  },
}));

beforeEach(() => {
  markers.length = 0;
});

const worker = (over: Partial<SimpleWorker>): SimpleWorker => ({
  user_id: 'w1',
  full_name: 'Budi',
  lat: -7.2,
  lng: 112.7,
  status: 'active',
  role: 'satgas',
  is_within_area: true,
  is_scheduled: true,
  ...over,
});

const labelText = (i: number) => markers[i].content.querySelector('.am-label')?.textContent;

describe('WorkerClusterLayer', () => {
  it('renders one pin per worker with the worker name baked into the content', () => {
    render(
      <WorkerClusterLayer
        workers={[worker({ user_id: 'w1', full_name: 'Budi' }), worker({ user_id: 'w2', full_name: 'Sari', lat: -7.3 })]}
        zoom={15}
        teamBubbles={false}
      />
    );
    expect(markers).toHaveLength(2);
    expect(labelText(0)).toBe('Budi');
    expect(labelText(1)).toBe('Sari');
  });

  it('fires onSelect with the worker id when a pin is clicked', () => {
    const onSelect = jest.fn();
    render(
      <WorkerClusterLayer workers={[worker({ user_id: 'w7' })]} zoom={15} teamBubbles={false} onSelect={onSelect} />
    );
    fireEvent.click(document.querySelector('[data-testid="marker"]')!);
    expect(onSelect).toHaveBeenCalledWith('w7');
  });

  it('collapses a ≥2-member team into one team marker that opens its members', () => {
    const onTeamClick = jest.fn();
    const team = { team_id: 't1', team_name: 'Penyiraman', team_color: '#69D2E7', team_icon: 'droplets' };
    render(
      <WorkerClusterLayer
        workers={[
          worker({ user_id: 'w1', full_name: 'Budi', ...team }),
          worker({ user_id: 'w2', full_name: 'Sari', lat: -7.21, ...team }),
        ]}
        zoom={15}
        teamBubbles
        onTeamClick={onTeamClick}
      />
    );
    // One collapsed team marker, not two worker pins.
    expect(markers).toHaveLength(1);
    expect(labelText(0)).toBe('Penyiraman');
    markers[0].onClick?.();
    expect(onTeamClick).toHaveBeenCalledTimes(1);
    expect(onTeamClick.mock.calls[0][0]).toMatchObject({ kind: 'team', team_id: 't1', member_count: 2 });
  });

  it('draws a worker outside their area with a dashed outline', () => {
    render(<WorkerClusterLayer workers={[worker({ is_within_area: false })]} zoom={15} teamBubbles={false} />);
    expect(markers[0].content.innerHTML).toContain('stroke-dasharray'); // luar area
  });
});
