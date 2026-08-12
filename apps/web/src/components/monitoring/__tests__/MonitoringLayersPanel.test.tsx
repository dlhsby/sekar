import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringLayersPanel } from '../MonitoringLayersPanel';
import { DEFAULT_LAYERS } from '@/lib/monitoring/layers';

describe('MonitoringLayersPanel', () => {
  const base = {
    layers: DEFAULT_LAYERS,
    onSetLayer: jest.fn(),
    mode: 'drill' as const,
    onSetMode: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders a select for every layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.getByLabelText(/batas rayon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/batas kawasan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/batas lokasi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/petugas & tim/i)).toBeInTheDocument();
  });

  it('offers boundary/marker/both/hidden on a geo layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    const select = screen.getByLabelText(/batas rayon/i) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'all',
      'boundary',
      'marker',
      'none',
    ]);
  });

  it('reports the chosen value for the layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.change(screen.getByLabelText(/batas kawasan/i), { target: { value: 'marker' } });
    expect(base.onSetLayer).toHaveBeenCalledWith('kawasan', 'marker');
  });

  it('offers personnel as one select, so Tim-without-Petugas cannot be expressed', () => {
    render(<MonitoringLayersPanel {...base} />);
    const select = screen.getByLabelText(/petugas & tim/i) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'all',
      'petugas',
      'tim',
      'none',
    ]);
  });

  it('has no city row — Surabaya has no boundary polygon to draw', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.queryByLabelText(/kota|surabaya/i)).toBeNull();
  });

  it('offers the two monitoring modes, with the current one selected', () => {
    render(<MonitoringLayersPanel {...base} />);
    const drill = screen.getByRole('radio', { name: /ketuk & telusuri/i });
    const zoom = screen.getByRole('radio', { name: /^zoom$/i });
    expect(drill).toHaveAttribute('aria-checked', 'true');
    expect(zoom).toHaveAttribute('aria-checked', 'false');
  });

  it('reports a mode change', () => {
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.click(screen.getByRole('radio', { name: /^zoom$/i }));
    expect(base.onSetMode).toHaveBeenCalledWith('zoom');
  });
});
