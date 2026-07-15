/**
 * Unit tests: YearView — 12 mini month calendars with a load heatmap.
 *
 * The real logic is the heatmap: buckets are relative to the YEAR'S PEAK, so the
 * ramp is meaningful rather than absolute, and days outside a mini-month must
 * never be tinted (they belong to the neighbouring month's card).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearView } from '../YearView';

const YEAR = 2026;

function setup(counts?: Map<string, number>) {
  const onSelectMonth = jest.fn();
  const onSelectDay = jest.fn();
  render(
    <YearView
      year={YEAR}
      onSelectMonth={onSelectMonth}
      onSelectDay={onSelectDay}
      localeCode="id-ID"
      counts={counts}
    />
  );
  return { onSelectMonth, onSelectDay };
}

/** The mini-month card for a month label. */
const monthCard = (label: string) => screen.getByText(label).closest('div')!;

describe('YearView', () => {
  it('renders all twelve months', () => {
    setup();
    for (const m of [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]) {
      expect(screen.getByText(m)).toBeInTheDocument();
    }
  });

  it('opens a month from its name', async () => {
    const user = userEvent.setup();
    const { onSelectMonth } = setup();

    await user.click(screen.getByText('Maret'));
    expect(onSelectMonth).toHaveBeenCalledWith(2); // 0-indexed
  });

  it('opens a day as an ISO date', async () => {
    const user = userEvent.setup();
    const { onSelectDay } = setup();

    const jan = monthCard('Januari');
    await user.click(within(jan).getByRole('button', { name: '15' }));

    expect(onSelectDay).toHaveBeenCalledWith('2026-01-15');
  });

  it('tints days by load relative to the year peak', () => {
    // Peak = 100 (Jan 5). Jan 2 at 20 → ratio .2 → bucket 1; Jan 3 at 100 → bucket 4.
    setup(
      new Map([
        ['2026-01-02', 20],
        ['2026-01-03', 100],
        ['2026-01-05', 100],
      ])
    );
    const jan = monthCard('Januari');

    const light = within(jan).getByRole('button', { name: '2' });
    const heavy = within(jan).getByRole('button', { name: '3' });

    expect(light.className).toContain('bg-nb-primary/25');
    expect(heavy.className).toContain('bg-nb-primary');
    expect(heavy.className).not.toContain('bg-nb-primary/25');
  });

  it('leaves zero-load days untinted', () => {
    setup(new Map([['2026-01-03', 10]]));
    const jan = monthCard('Januari');

    // Day 4 has no count → no heat class at all.
    expect(within(jan).getByRole('button', { name: '4' }).className).not.toContain('bg-nb-primary');
  });

  it('rescales the ramp when the peak changes (buckets are relative)', () => {
    // Same raw count (20) but peak is now 20 → ratio 1 → top bucket, not bucket 1.
    setup(new Map([['2026-01-02', 20]]));
    const jan = monthCard('Januari');
    const day2 = within(jan).getByRole('button', { name: '2' });

    expect(day2.className).toContain('bg-nb-primary');
    expect(day2.className).not.toContain('bg-nb-primary/25');
  });

  it('never tints spill-over days from the neighbouring month', () => {
    // 2026-01-01 is a Thursday, so the Januari card leads with Dec 29–31.
    setup(new Map([['2025-12-31', 500]]));
    const jan = monthCard('Januari');

    // The spill-over 31 in Januari's card must stay untinted.
    const spill = within(jan).getAllByRole('button', { name: '31' })[0];
    expect(spill.className).not.toContain('bg-nb-primary');
  });
});
