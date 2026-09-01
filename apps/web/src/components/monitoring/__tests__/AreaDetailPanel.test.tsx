import { render, screen, fireEvent } from '@testing-library/react';
import { AreaDetailPanel, type AreaDetailPanelProps } from '../AreaDetailPanel';

const presenceLabels: AreaDetailPanelProps['presenceLabels'] = [
  { key: 'aktif', label: 'Aktif', color: 'var(--color-status-active)' },
  { key: 'tidak_aktif', label: 'Tidak Aktif', color: 'var(--color-status-idle)' },
  { key: 'tidak_hadir', label: 'Tidak hadir', color: 'var(--color-status-missing)' },
  { key: 'adhoc', label: 'Luar jadwal', color: 'var(--color-status-offline)' },
];

const base: AreaDetailPanelProps = {
  variant: 'district',
  name: 'Rayon Barat',
  presence: { aktif: 4, tidak_aktif: 2, tidak_hadir: 1, adhoc: 3 },
  presenceLabels,
  roster: { scheduled: 10, clocked_in: 6, belum_hadir: 3, tidak_hadir: 1 },
  childCount: 12,
  understaffedChildCount: 5,
  isUnderstaffed: true,
  onClose: jest.fn(),
};

describe('AreaDetailPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('leads with the node identity and the staffing verdict', () => {
    render(<AreaDetailPanel {...base} />);
    expect(screen.getByText('Rayon Barat')).toBeInTheDocument();
    expect(screen.getByText(/kekurangan personel/i)).toBeInTheDocument();
  });

  it('says "cukup" when the area is staffed', () => {
    render(<AreaDetailPanel {...base} isUnderstaffed={false} />);
    expect(screen.getByText(/cukup/i)).toBeInTheDocument();
  });

  it('shows child counts for a rayon and headcount for a lokasi', () => {
    // Assert through the TILE LABEL, not the bare number: the same figures also
    // appear in the roster row below, so a loose text query is ambiguous.
    const tileValue = (id: string) =>
      screen.getByTestId(id).querySelector('span:nth-child(2)')?.textContent;

    const { unmount } = render(<AreaDetailPanel {...base} />);
    expect(tileValue('tile-children')).toBe('12');
    expect(tileValue('tile-understaffed-children')).toBe('5');
    unmount();

    render(
      <AreaDetailPanel
        {...base}
        variant="location"
        name="Taman Bungkul"
        childCount={null}
        roster={{ scheduled: 9, clocked_in: 7, belum_hadir: 1, tidak_hadir: 1 }}
        staffing={[{ role: 'satgas', required: 4, active: 2 }]}
      />
    );
    // Lokasi swaps the tiles for live headcount (aktif + tidak aktif) vs rostered.
    expect(tileValue('tile-headcount')).toBe('6');
    expect(tileValue('tile-assigned')).toBe('9');
  });

  it('renders the per-role staffing split with a signed delta, lokasi only', () => {
    render(
      <AreaDetailPanel
        {...base}
        variant="location"
        staffing={[
          { role: 'satgas', required: 4, active: 2 },
          { role: 'linmas', required: 1, active: 3 },
        ]}
      />
    );
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByText('3/1')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('hides the per-role split for a rayon — its requirement is the sum of its lokasi', () => {
    render(<AreaDetailPanel {...base} staffing={[{ role: 'satgas', required: 4, active: 2 }]} />);
    expect(screen.queryByText('2/4')).toBeNull();
  });

  it('closes', () => {
    render(<AreaDetailPanel {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /tutup/i }));
    expect(base.onClose).toHaveBeenCalled();
  });

  /**
   * M9 (parity). The reassign entry point was stripped by the 2026-06-10
   * "minimal reliable map baseline" rebuild and never layered back on, leaving
   * BulkReassignModal fully built, fully tested and reachable by nobody.
   */
  describe('reassign entry point', () => {
    it('offers reassign on an understaffed lokasi', () => {
      const onReassign = jest.fn();
      render(
        <AreaDetailPanel {...base} variant="location" isUnderstaffed onReassign={onReassign} />,
      );

      fireEvent.click(screen.getByTestId('area-detail-reassign'));

      expect(onReassign).toHaveBeenCalledTimes(1);
    });

    it('hides it on a fully staffed lokasi — the modal pulls workers IN, so there is nothing to fix', () => {
      render(
        <AreaDetailPanel
          {...base}
          variant="location"
          isUnderstaffed={false}
          onReassign={jest.fn()}
        />,
      );

      expect(screen.queryByTestId('area-detail-reassign')).not.toBeInTheDocument();
    });

    it('hides it on a rayon — reassignment targets a lokasi', () => {
      render(<AreaDetailPanel {...base} variant="district" isUnderstaffed onReassign={jest.fn()} />);

      expect(screen.queryByTestId('area-detail-reassign')).not.toBeInTheDocument();
    });

    it('hides it when no handler is supplied — the exact state that hid it for 11 weeks', () => {
      render(<AreaDetailPanel {...base} variant="location" isUnderstaffed />);

      expect(screen.queryByTestId('area-detail-reassign')).not.toBeInTheDocument();
    });
  });

  /**
   * Regression: the header reads `areaDetail.${variant}`, and the locale carried
   * `area` — a leftover from the Area→Location rename — while the variant for a
   * lokasi is `location`. Every lokasi panel therefore rendered the raw key
   * "areaDetail.location" as its type label.
   *
   * The i18n call-site guard cannot catch this: the key is a template literal,
   * which it skips rather than guess at. So it is pinned here, per variant.
   */
  describe('type label', () => {
    it.each(['district', 'region', 'location'] as const)(
      'renders a real label for %s, never a raw key',
      (variant) => {
        const { container } = render(<AreaDetailPanel {...base} variant={variant} />);
        expect(container.textContent).not.toContain('areaDetail.');
      },
    );

    it('names a lokasi "Lokasi"', () => {
      render(<AreaDetailPanel {...base} variant="location" />);
      expect(screen.getByText('Lokasi')).toBeInTheDocument();
    });
  });
});
