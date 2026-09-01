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

  /** Open a row's dropdown and return a scope for its checkboxes. */
  const openRow = (name: RegExp) => {
    fireEvent.click(screen.getByRole('combobox', { name }));
    return within(screen.getByRole('listbox', { name }));
  };

  it('renders one control per layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    for (const name of [/^rayon$/i, /^kawasan$/i, /^lokasi$/i, /petugas & tim/i]) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    }
  });

  it('states each row\'s selection on the closed control', () => {
    // The panel is read far more often than it is changed, so a row has to be
    // legible without opening it. All four facets on collapses to one word.
    render(
      <MonitoringLayersPanel
        {...base}
        layers={{ ...DEFAULT_LAYERS, district: ['boundary', 'marker'], kawasan: [] }}
      />
    );
    expect(screen.getByRole('combobox', { name: /^rayon$/i })).toHaveTextContent('Batas, Marker');
    expect(screen.getByRole('combobox', { name: /^kawasan$/i })).toHaveTextContent(/sembunyikan/i);
    expect(screen.getByRole('combobox', { name: /^lokasi$/i })).toHaveTextContent(/semua/i);
  });

  it('offers boundary, fill, marker and label as INDEPENDENT checkboxes on a geo layer', () => {
    render(<MonitoringLayersPanel {...base} />);
    const row = openRow(/^rayon$/i);
    // Four facets plus the all-row.
    expect(row.getAllByRole('checkbox')).toHaveLength(5);
    // Fill was never separately expressible under the four-way select this
    // whole control replaced.
    expect(row.getByLabelText(/isian/i)).toBeInTheDocument();
  });

  it('reports the whole facet set when one checkbox is toggled', () => {
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.click(openRow(/^kawasan$/i).getByLabelText(/isian/i));
    // The setter takes a SET, not a delta — the caller never has to merge.
    expect(base.onSetLayer).toHaveBeenCalledWith('kawasan', ['boundary', 'marker', 'label']);
  });

  it('clears the row from the all-row when it is full', () => {
    // Semua/Sembunyikan used to be two link buttons beside the chips. They are
    // now the list's own all-row, which writes exactly the set the boxes do —
    // so the shortcut and the options can never disagree.
    render(<MonitoringLayersPanel {...base} />);
    fireEvent.click(openRow(/^rayon$/i).getByLabelText(/^semua$/i));
    expect(base.onSetLayer).toHaveBeenCalledWith('district', []);
  });

  it('fills the row from the all-row when it is empty', () => {
    render(<MonitoringLayersPanel {...base} layers={{ ...DEFAULT_LAYERS, district: [] }} />);
    fireEvent.click(openRow(/^rayon$/i).getByLabelText(/^semua$/i));
    expect(base.onSetLayer).toHaveBeenCalledWith('district', [
      'boundary',
      'fill',
      'marker',
      'label',
    ]);
  });

  it('shows the all-row as mixed when a row is partly on', () => {
    render(
      <MonitoringLayersPanel {...base} layers={{ ...DEFAULT_LAYERS, district: ['boundary'] }} />
    );
    const all = openRow(/^rayon$/i).getByLabelText(/^semua$/i) as HTMLInputElement;
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
  });

  it('lets Tim be ticked without Petugas — the map then shows teams only', () => {
    render(<MonitoringLayersPanel {...base} layers={{ ...DEFAULT_LAYERS, personnel: ['tim'] }} />);
    const row = openRow(/petugas & tim/i);
    expect((row.getByLabelText(/^tim$/i) as HTMLInputElement).checked).toBe(true);
    expect((row.getByLabelText(/^petugas$/i) as HTMLInputElement).checked).toBe(false);
  });

  it('has no city row — Surabaya has no boundary polygon to draw', () => {
    render(<MonitoringLayersPanel {...base} />);
    expect(screen.queryByRole('combobox', { name: /kota|surabaya/i })).toBeNull();
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
