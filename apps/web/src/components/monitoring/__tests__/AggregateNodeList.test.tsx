import { render, screen, fireEvent } from '@testing-library/react';
import { AggregateNodeList } from '../AggregateNodeList';
import type { AggregateNode } from '@/lib/api/monitoring-v2';

const node = (over: Partial<AggregateNode> = {}): AggregateNode => ({
  id: 'n-1',
  name: 'Rayon Barat',
  type: 'district',
  center_lat: -7.25,
  center_lng: 112.75,
  counts_by_status: { active: 0, offline: 0, absent: 0, outside_area: 0 },
  counts_by_role: {},
  worker_count: 0,
  online_count: 0,
  required: 0,
  is_understaffed: false,
  roster: { scheduled: 4, clocked_in: 2, belum_hadir: 1, tidak_hadir: 1 },
  presence: {
    aktif: { dalam: 2, luar: 0 },
    tidak_aktif: { dalam: 0, luar: 0 },
  },
  ...over,
});

describe('AggregateNodeList — row-level hide', () => {
  it('drops a hidden row but leaves every remaining number intact', () => {
    // Hiding is presentation, never accounting: the counts come from the server
    // over the full scope, so what survives is unchanged by what was hidden.
    render(
      <AggregateNodeList
        nodes={[node({ id: 'a', name: 'Rayon A' }), node({ id: 'b', name: 'Rayon B' })]}
        onDrill={jest.fn()}
        isHidden={(id) => id === 'a'}
        onToggleHidden={jest.fn()}
        onShowAllHidden={jest.fn()}
      />
    );
    expect(screen.queryByText('Rayon A')).toBeNull();
    expect(screen.getByText('Rayon B')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('announces the hidden count with a way back — hiding is never silent', () => {
    const onShowAll = jest.fn();
    render(
      <AggregateNodeList
        nodes={[node({ id: 'a' }), node({ id: 'b' })]}
        onDrill={jest.fn()}
        isHidden={(id) => id === 'a'}
        onToggleHidden={jest.fn()}
        onShowAllHidden={onShowAll}
      />
    );
    expect(screen.getByText(/1 disembunyikan/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tampilkan semua/i }));
    expect(onShowAll).toHaveBeenCalled();
  });

  it('reports which row was hidden', () => {
    const onToggle = jest.fn();
    render(
      <AggregateNodeList
        nodes={[node({ id: 'a', name: 'Rayon A' })]}
        onDrill={jest.fn()}
        onToggleHidden={onToggle}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /sembunyikan rayon a/i }));
    expect(onToggle).toHaveBeenCalledWith('a');
  });

  it('still shows the restore banner when EVERY row is hidden', () => {
    // Otherwise the panel is an empty state with no explanation and no way out.
    render(
      <AggregateNodeList
        nodes={[node({ id: 'a' })]}
        onDrill={jest.fn()}
        isHidden={() => true}
        onToggleHidden={jest.fn()}
        onShowAllHidden={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /tampilkan semua/i })).toBeInTheDocument();
  });

  it('renders no hide control when the caller does not opt in', () => {
    render(<AggregateNodeList nodes={[node()]} onDrill={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /sembunyikan/i })).toBeNull();
  });

  it('drilling still works on a list that has hidden rows', () => {
    const onDrill = jest.fn();
    render(
      <AggregateNodeList
        nodes={[node({ id: 'a' }), node({ id: 'b', name: 'Rayon B' })]}
        onDrill={onDrill}
        isHidden={(id) => id === 'a'}
        onToggleHidden={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Rayon B'));
    expect(onDrill).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });
});

describe('a long name must not push the row actions off screen', () => {
  const LONG = 'Kawasan Manukan Balongsari S.D Manukan Tengah Jaya Raya';

  it('keeps the hide and detail buttons reachable', () => {
    // The reported defect: the name button grew to fit its text and shoved both
    // actions out of the row. A flex item defaults to `min-width: auto`, so
    // `truncate` on the name alone did nothing — the whole chain from the row
    // button down to the name has to be allowed to shrink.
    render(
      <AggregateNodeList
        nodes={[node({ name: LONG })]}
        onDrill={jest.fn()}
        onDetail={jest.fn()}
        onToggleHidden={jest.fn()}
      />
    );
    expect(screen.getByLabelText(`Sembunyikan ${LONG}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`Detail ${LONG}`)).toBeInTheDocument();
  });

  it('lets every element in the shrink chain shrink', () => {
    // Asserted structurally because the failure is invisible to jsdom, which
    // does no layout: one missing `min-w-0` and the ellipsis silently stops
    // working in the browser while every behavioural test still passes.
    const { container } = render(
      <AggregateNodeList nodes={[node({ name: LONG })]} onDrill={jest.fn()} />
    );
    const name = screen.getByText(LONG);
    expect(name.className).toMatch(/truncate/);
    expect(name.className).toMatch(/min-w-0/);
    expect(name.parentElement!.className).toMatch(/min-w-0/);
    // The row button itself, two levels up from the name's flex row.
    const rowButton = container.querySelector('li > button')!;
    expect(rowButton.className).toMatch(/min-w-0/);
  });

  it('exposes the full name on hover, since the visible text is cut', () => {
    render(<AggregateNodeList nodes={[node({ name: LONG })]} onDrill={jest.fn()} />);
    expect(screen.getByText(LONG)).toHaveAttribute('title', LONG);
  });
});
