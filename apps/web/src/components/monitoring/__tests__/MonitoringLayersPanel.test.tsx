import { render, screen, fireEvent, within } from '@testing-library/react';
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

  it('renders a facet group for every layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.getByRole('group', { name: /^rayon$/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^kawasan$/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^lokasi$/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /petugas & tim/i })).toBeInTheDocument();
  });

  it('offers boundary, fill, marker and label as INDEPENDENT checkboxes on a geo layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    const group = screen.getByRole('group', { name: /^rayon$/i });
    const boxes = within(group).getAllByRole('checkbox');
    expect(boxes).toHaveLength(4);
    // Fill was never separately expressible under the four-way select.
    expect(within(group).getByLabelText(/isian/i)).toBeInTheDocument();
    expect(boxes.every((b) => (b as HTMLInputElement).checked)).toBe(true);
  });

  it('reports the whole facet set when one checkbox is toggled', () => {
    render(<MonitoringLayersPanel {...base} />);
    const group = screen.getByRole('group', { name: /^kawasan$/i });
    fireEvent.click(within(group).getByLabelText(/isian/i));
    // The setter takes a SET, not a delta — the caller never has to merge.
    expect(base.onSetLayer).toHaveBeenCalledWith('kawasan', ['boundary', 'marker', 'label']);
  });

  it('Sembunyikan clears the row', () => {
    // The shortcuts write the same set the checkboxes do, so the two can never
    // disagree — the usual failure mode of a "select all" box beside checkboxes.
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.click(screen.getAllByRole('button', { name: /sembunyikan/i })[0]);
    expect(base.onSetLayer).toHaveBeenCalledWith('district', []);
  });

  it('Semua fills the row', () => {
    render(<MonitoringLayersPanel {...base} layers={{ ...DEFAULT_LAYERS, district: [] }} />);
    fireEvent.click(screen.getAllByRole('button', { name: /^semua$/i })[0]);
    expect(base.onSetLayer).toHaveBeenCalledWith('district', [
      'boundary',
      'fill',
      'marker',
      'label',
    ]);
  });

  it('lets Tim be ticked without Petugas — the map then shows teams only', () => {
    render(<MonitoringLayersPanel {...base} layers={{ ...DEFAULT_LAYERS, personnel: ['tim'] }} />);
    const group = screen.getByRole('group', { name: /petugas & tim/i });
    expect((within(group).getByLabelText(/^tim$/i) as HTMLInputElement).checked).toBe(true);
    expect((within(group).getByLabelText(/^petugas$/i) as HTMLInputElement).checked).toBe(false);
  });

  it('has no city row — Surabaya has no boundary polygon to draw', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.queryByRole('group', { name: /kota|surabaya/i })).toBeNull();
  });

  it('offers the three monitoring modes in one select, current value shown', () => {
    // A segmented control fitted two options; three could not be shown without
    // truncating their labels.
    render(<MonitoringLayersPanel {...base} />);
    const select = screen.getByLabelText(/mode monitoring/i) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'drill',
      'zoom',
      'viewport',
    ]);
    expect(select.value).toBe('drill');
  });

  it('reports a mode change', () => {
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.change(screen.getByLabelText(/mode monitoring/i), {
      target: { value: 'viewport' },
    });
    expect(base.onSetMode).toHaveBeenCalledWith('viewport');
  });

  it('describes the selected mode, so the payload trade is stated up front', () => {
    render(<MonitoringLayersPanel {...base} mode="viewport" />);
    expect(screen.getByText(/hanya memuat area yang terlihat/i)).toBeInTheDocument();
  });
});
