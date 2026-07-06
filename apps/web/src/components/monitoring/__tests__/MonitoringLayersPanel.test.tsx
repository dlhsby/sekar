import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringLayersPanel } from '../MonitoringLayersPanel';
import { DEFAULT_LAYERS } from '@/lib/monitoring/layers';

describe('MonitoringLayersPanel', () => {
  const base = {
    layers: DEFAULT_LAYERS,
    onToggleLayer: jest.fn(),
    mode: 'aggregate' as const,
    onModeChange: jest.fn(),
    showModeToggle: true,
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

  it('switches view mode', () => {
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /semua petugas/i }));
    expect(base.onModeChange).toHaveBeenCalledWith('workers');
  });

  it('hides the mode switch when showModeToggle is false', () => {
    render(<MonitoringLayersPanel {...base} showModeToggle={false} />);
    expect(screen.queryByRole('button', { name: /semua petugas/i })).toBeNull();
  });
});
