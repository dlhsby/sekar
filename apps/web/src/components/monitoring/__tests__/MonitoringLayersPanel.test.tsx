import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringLayersPanel } from '../MonitoringLayersPanel';
import { DEFAULT_LAYERS } from '@/lib/monitoring/layers';

describe('MonitoringLayersPanel', () => {
  const base = {
    layers: DEFAULT_LAYERS,
    onToggleLayer: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders a toggle for every layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.getByRole('button', { name: /batas rayon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /warna rayon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^petugas$/i })).toBeInTheDocument();
  });

  it('toggles a layer on click', () => {
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /batas area/i }));
    expect(base.onToggleLayer).toHaveBeenCalledWith('areaBorder');
  });

  it('no longer renders a view-mode switch', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.queryByRole('button', { name: /semua petugas/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ringkasan/i })).toBeNull();
  });
});
