/**
 * Unit Tests: StaffingSummaryCard Component
 *
 * Covers:
 * - City view (no filters) — district accordion rows from boundaries prop
 * - Rayon view (district_id filter) — per-area expandable rows from boundaries prop
 * - Area view (location_id filter) — role breakdown with progress bars via useStaffingSummary hook
 * - Day-type badge rendering
 * - Understaffed indicators (UnderstaffedBadge)
 * - Reassign button click callback
 * - Loading state (area view skeleton)
 * - Empty / no-data states
 * - Accordion expand / collapse interactions
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StaffingSummaryCard } from '../StaffingSummaryCard';
import type { BoundariesResponse, StaffingSummaryResponse } from '@/lib/api/monitoring';

// ---------------------------------------------------------------------------
// Mock the monitoring API module
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/monitoring', () => ({
  useStaffingSummary: jest.fn(),
}));

import { useStaffingSummary } from '@/lib/api/monitoring';

const mockUseStaffingSummary = useStaffingSummary as jest.MockedFunction<typeof useStaffingSummary>;

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_BOUNDARIES: BoundariesResponse = {
  generated_at: '2026-03-08T06:00:00Z',
  districts: [
    {
      id: 'district-1',
      name: 'Rayon Pusat',
      boundary_polygon: null,
      center_lat: -7.25,
      center_lng: 112.75,
      area_count: 2,
      is_understaffed: true,
      understaffed_area_count: 1,
      regions: [],
      areas: [
        {
          id: 'area-1',
          name: 'Taman Bungkul',
          boundary_polygon: null,
          center_lat: -7.289659,
          center_lng: 112.739208,
          district_id: 'district-1',
          district_name: 'Rayon Pusat',
          assigned_count: 5,
          is_understaffed: true,
          staffing_summary: [
            { role: 'satgas', required: 3, active: 2 },
            { role: 'linmas', required: 1, active: 1 },
          ],
        },
        {
          id: 'area-2',
          name: 'Taman Apsari',
          boundary_polygon: null,
          center_lat: -7.28,
          center_lng: 112.74,
          district_id: 'district-1',
          district_name: 'Rayon Pusat',
          assigned_count: 3,
          is_understaffed: false,
          staffing_summary: [
            { role: 'satgas', required: 2, active: 2 },
            { role: 'linmas', required: 1, active: 1 },
          ],
        },
      ],
    },
    {
      id: 'district-2',
      name: 'Rayon Selatan',
      boundary_polygon: null,
      center_lat: -7.35,
      center_lng: 112.73,
      area_count: 1,
      is_understaffed: false,
      understaffed_area_count: 0,
      regions: [],
      areas: [
        {
          id: 'area-3',
          name: 'Taman Flora',
          boundary_polygon: null,
          center_lat: -7.35,
          center_lng: 112.73,
          district_id: 'district-2',
          district_name: 'Rayon Selatan',
          assigned_count: 4,
          is_understaffed: false,
          staffing_summary: [
            { role: 'satgas', required: 2, active: 2 },
            { role: 'linmas', required: 2, active: 2 },
          ],
        },
      ],
    },
  ],
};

const MOCK_STAFFING_RESPONSE: StaffingSummaryResponse = {
  generated_at: '2026-03-08T06:00:00Z',
  items: [
    {
      id: 'area-1',
      name: 'Taman Bungkul',
      type: 'area',
      roles: [
        {
          role: 'satgas',
          active: 2,
          offline: 0,
          absent: 1,
          outside_area: 0,
          total_assigned: 3,
          total_required: 3,
        },
        {
          role: 'linmas',
          active: 1,
          offline: 0,
          absent: 0,
          outside_area: 0,
          total_assigned: 1,
          total_required: 1,
        },
      ],
      total_active: 3,
      total_offline: 0,
      total_absent: 1,
      total_outside_area: 0,
      is_fully_staffed: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHookReturn(overrides: Partial<ReturnType<typeof useStaffingSummary>> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    isSuccess: false,
    status: 'idle' as const,
    fetchStatus: 'idle' as const,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    refetch: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useStaffingSummary>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StaffingSummaryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: hook returns no data and is not loading (only used in Area view)
    mockUseStaffingSummary.mockReturnValue(buildHookReturn());
  });

  // -------------------------------------------------------------------------
  // Header rendering
  // -------------------------------------------------------------------------

  describe('Header', () => {
    it('should render the "Ketersediaan Petugas" heading', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText(/ketersediaan petugas/i)).toBeInTheDocument();
    });

    it('should show "Seluruh Kota" label when no filter is active', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText(/seluruh kota/i)).toBeInTheDocument();
    });

    it('should show "Rayon" label when district_id filter is active', () => {
      render(
        <StaffingSummaryCard filters={{ district_id: 'district-1' }} boundaries={MOCK_BOUNDARIES} />
      );
      expect(screen.getByText(/rayon/i)).toBeInTheDocument();
    });

    it('should show "Area" label when location_id filter is active', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={{ location_id: 'area-1' }} boundaries={MOCK_BOUNDARIES} />);
      // The view label is rendered inside a <span> child of the heading
      const heading = screen.getByRole('heading');
      expect(heading).toHaveTextContent(/area/i);
    });
  });

  // -------------------------------------------------------------------------
  // Day-type badge
  // -------------------------------------------------------------------------

  describe('Day-type badge', () => {
    it('should render "Hari Kerja" badge for weekday dayType', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} dayType="weekday" />);
      expect(screen.getByText('Hari Kerja')).toBeInTheDocument();
    });

    it('should render "Akhir Pekan" badge for weekend dayType', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} dayType="weekend" />);
      expect(screen.getByText('Akhir Pekan')).toBeInTheDocument();
    });

    it('should render "Hari Libur" badge for holiday dayType', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} dayType="holiday" />);
      expect(screen.getByText('Hari Libur')).toBeInTheDocument();
    });

    it('should not render any day-type badge when dayType is not provided', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.queryByText('Hari Kerja')).not.toBeInTheDocument();
      expect(screen.queryByText('Akhir Pekan')).not.toBeInTheDocument();
      expect(screen.queryByText('Hari Libur')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // City View
  // -------------------------------------------------------------------------

  describe('City view (no filters)', () => {
    it('should render a row for each district in boundaries', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText('Rayon Pusat')).toBeInTheDocument();
      expect(screen.getByText('Rayon Selatan')).toBeInTheDocument();
    });

    it('should display active/required counts for each district', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      // Rayon Pusat: area-1 (active 2+1=3, required 3+1=4) + area-2 (active 2+1=3, required 2+1=3) = 6/7
      expect(screen.getByText('6/7')).toBeInTheDocument();
      // Rayon Selatan: area-3 (active 2+2=4, required 2+2=4) = 4/4
      expect(screen.getByText('4/4')).toBeInTheDocument();
    });

    it('should show understaffed badge for understaffed districts', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      // Rayon Pusat has understaffed_area_count=1
      expect(screen.getByText(/kurang 1/i)).toBeInTheDocument();
    });

    it('should not show understaffed badge for fully-staffed districts', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      // Rayon Selatan is not understaffed — only one "Kurang" badge should appear
      const badges = screen.getAllByText(/kurang/i);
      expect(badges).toHaveLength(1);
    });

    it('should render "Data wilayah tidak tersedia" when boundaries is undefined', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={undefined} />);
      expect(screen.getByText(/data wilayah tidak tersedia/i)).toBeInTheDocument();
    });

    it('should render "Data wilayah tidak tersedia" when boundaries has empty districts array', () => {
      render(
        <StaffingSummaryCard
          filters={{}}
          boundaries={{ districts: [], generated_at: '2026-03-08T00:00:00Z' }}
        />
      );
      expect(screen.getByText(/data wilayah tidak tersedia/i)).toBeInTheDocument();
    });

    // Accordion expand / collapse
    it('should not show area rows before expanding a district', () => {
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.queryByText('Taman Bungkul')).not.toBeInTheDocument();
    });

    it('should reveal area rows after clicking the district accordion button', async () => {
      const user = userEvent.setup();
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);

      const districtButton = screen.getByRole('button', { name: /rayon pusat/i });
      await user.click(districtButton);

      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Taman Apsari')).toBeInTheDocument();
    });

    it('should collapse area rows when the expanded district button is clicked again', async () => {
      const user = userEvent.setup();
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);

      const districtButton = screen.getByRole('button', { name: /rayon pusat/i });
      await user.click(districtButton);
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();

      await user.click(districtButton);
      expect(screen.queryByText('Taman Bungkul')).not.toBeInTheDocument();
    });

    it('should show area-level understaffed badge inside expanded district for understaffed area', async () => {
      const user = userEvent.setup();
      render(<StaffingSummaryCard filters={{}} boundaries={MOCK_BOUNDARIES} />);

      await user.click(screen.getByRole('button', { name: /rayon pusat/i }));

      // After expansion there are two "Kurang 1" badges:
      // one at district level (understaffed_area_count=1) and one at the Taman Bungkul area row
      const badges = screen.getAllByText(/kurang 1/i);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // Rayon View
  // -------------------------------------------------------------------------

  describe('Rayon view (district_id filter)', () => {
    const districtFilters = { district_id: 'district-1' };

    it('should render an expandable row for each area in the selected district', () => {
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Taman Apsari')).toBeInTheDocument();
    });

    it('should display active/required counts for each area row', () => {
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);
      // Taman Bungkul: active=2+1=3, required=3+1=4 => "3/4"
      expect(screen.getByText('3/4')).toBeInTheDocument();
      // Taman Apsari: active=2+1=3, required=2+1=3 => "3/3"
      expect(screen.getByText('3/3')).toBeInTheDocument();
    });

    it('should show understaffed badge for understaffed area', () => {
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);
      // Taman Bungkul shortage = (3-2) = 1
      expect(screen.getByText(/kurang 1/i)).toBeInTheDocument();
    });

    it('should render "Data rayon tidak tersedia" when the district_id does not match any boundary', () => {
      render(
        <StaffingSummaryCard filters={{ district_id: 'district-999' }} boundaries={MOCK_BOUNDARIES} />
      );
      expect(screen.getByText(/data rayon tidak tersedia/i)).toBeInTheDocument();
    });

    // Accordion expand / collapse (area within district view)
    it('should not show role breakdown before expanding an area row', () => {
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);
      // role label "Satgas" should not be visible until the accordion opens
      expect(screen.queryByText('Satgas')).not.toBeInTheDocument();
    });

    it('should reveal role breakdown rows when an area accordion button is clicked', async () => {
      const user = userEvent.setup();
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);

      const areaButton = screen.getByRole('button', { name: /taman bungkul/i });
      await user.click(areaButton);

      expect(screen.getByText('Satgas')).toBeInTheDocument();
      expect(screen.getByText('Linmas')).toBeInTheDocument();
    });

    it('should collapse role breakdown when the expanded area button is clicked again', async () => {
      const user = userEvent.setup();
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);

      const areaButton = screen.getByRole('button', { name: /taman bungkul/i });
      await user.click(areaButton);
      expect(screen.getByText('Satgas')).toBeInTheDocument();

      await user.click(areaButton);
      expect(screen.queryByText('Satgas')).not.toBeInTheDocument();
    });

    it('should call onReassign with area id when reassign button is clicked in expanded understaffed area', async () => {
      const user = userEvent.setup();
      const handleReassign = jest.fn();
      render(
        <StaffingSummaryCard
          filters={districtFilters}
          boundaries={MOCK_BOUNDARIES}
          onReassign={handleReassign}
        />
      );

      const areaButton = screen.getByRole('button', { name: /taman bungkul/i });
      await user.click(areaButton);

      const reassignButton = screen.getByRole('button', { name: /pindah petugas/i });
      await user.click(reassignButton);

      expect(handleReassign).toHaveBeenCalledWith('area-1');
    });

    it('should not show reassign button for fully-staffed expanded area', async () => {
      const user = userEvent.setup();
      render(
        <StaffingSummaryCard
          filters={districtFilters}
          boundaries={MOCK_BOUNDARIES}
          onReassign={jest.fn()}
        />
      );

      // Expand Taman Apsari (is_understaffed: false)
      const areaButton = screen.getByRole('button', { name: /taman apsari/i });
      await user.click(areaButton);

      expect(screen.queryByRole('button', { name: /pindah petugas/i })).not.toBeInTheDocument();
    });

    it('should not show reassign button when onReassign prop is not provided', async () => {
      const user = userEvent.setup();
      render(<StaffingSummaryCard filters={districtFilters} boundaries={MOCK_BOUNDARIES} />);

      const areaButton = screen.getByRole('button', { name: /taman bungkul/i });
      await user.click(areaButton);

      expect(screen.queryByRole('button', { name: /pindah petugas/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Area View
  // -------------------------------------------------------------------------

  describe('Area view (location_id filter)', () => {
    const areaFilters = { location_id: 'area-1' };

    it('should render loading skeleton while useStaffingSummary is loading', () => {
      mockUseStaffingSummary.mockReturnValue(buildHookReturn({ isLoading: true }));
      const { container } = render(
        <StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />
      );
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render "Data tidak tersedia" when hook returns no matching area item', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({
          data: { items: [], generated_at: '2026-03-08T00:00:00Z' },
          isSuccess: true,
        })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText(/data tidak tersedia/i)).toBeInTheDocument();
    });

    it('should render overall attendance count when data is loaded', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      // total_active=3, total_idle=0, total_outside_area=0 → present=3
      // totalAll = present(3) + missing(1) + offline(0) = 4
      expect(screen.getByText(/3 \/ 4 hadir/i)).toBeInTheDocument();
    });

    it('should render role breakdown rows for each role', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText('Satgas')).toBeInTheDocument();
      expect(screen.getByText('Linmas')).toBeInTheDocument();
    });

    it('should render present/required fraction for each role row', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      // satgas: present = active(2)+idle(0)+outside_area(0) = 2, required = total_required(3)
      expect(screen.getByText('2/3')).toBeInTheDocument();
      // linmas: present = 1+0+0 = 1, required = 1
      expect(screen.getByText('1/1')).toBeInTheDocument();
    });

    it('should render individual status counts (active/idle/outside/missing) for each role row', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      // satgas active count
      const activeCountElements = screen.getAllByTitle('Aktif');
      expect(activeCountElements.length).toBeGreaterThanOrEqual(1);
      expect(activeCountElements[0]).toHaveTextContent('2');
    });

    it('should render reassign button with shortage info for understaffed area', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(
        <StaffingSummaryCard
          filters={areaFilters}
          boundaries={MOCK_BOUNDARIES}
          onReassign={jest.fn()}
        />
      );
      // is_fully_staffed=false → button visible; satgas shortage = 3-2 = 1
      expect(screen.getByRole('button', { name: /pindah petugas/i })).toBeInTheDocument();
      expect(screen.getByText(/kurang 1/i)).toBeInTheDocument();
    });

    it('should call onReassign with location_id when reassign button is clicked', async () => {
      const user = userEvent.setup();
      const handleReassign = jest.fn();
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(
        <StaffingSummaryCard
          filters={areaFilters}
          boundaries={MOCK_BOUNDARIES}
          onReassign={handleReassign}
        />
      );

      await user.click(screen.getByRole('button', { name: /pindah petugas/i }));

      expect(handleReassign).toHaveBeenCalledTimes(1);
      expect(handleReassign).toHaveBeenCalledWith('area-1');
    });

    it('should not render reassign button when area is fully staffed', () => {
      const fullyStaffedResponse: StaffingSummaryResponse = {
        generated_at: '2026-03-08T06:00:00Z',
        items: [
          {
            id: 'area-1',
            name: 'Taman Bungkul',
            type: 'area',
            roles: [
              {
                role: 'satgas',
                active: 3,
                offline: 0,
                absent: 0,
                outside_area: 0,
                total_assigned: 3,
                total_required: 3,
              },
            ],
            total_active: 3,
            total_offline: 0,
            total_absent: 0,
            total_outside_area: 0,
            is_fully_staffed: true,
          },
        ],
      };
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: fullyStaffedResponse, isSuccess: true })
      );
      render(
        <StaffingSummaryCard
          filters={areaFilters}
          boundaries={MOCK_BOUNDARIES}
          onReassign={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /pindah petugas/i })).not.toBeInTheDocument();
    });

    it('should not render reassign button when onReassign prop is not provided', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.queryByRole('button', { name: /pindah petugas/i })).not.toBeInTheDocument();
    });

    it('should display the percentage of attendance in the progress header', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      // present=3, totalAll=4 → 75%
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show 0% attendance when all personnel are missing or offline', () => {
      const zeroResponse: StaffingSummaryResponse = {
        generated_at: '2026-03-08T06:00:00Z',
        items: [
          {
            id: 'area-1',
            name: 'Taman Bungkul',
            type: 'area',
            roles: [
              {
                role: 'satgas',
                active: 0,
                offline: 0,
                absent: 3,
                outside_area: 0,
                total_assigned: 3,
                total_required: 3,
              },
            ],
            total_active: 0,
            total_offline: 0,
            total_absent: 3,
            total_outside_area: 0,
            is_fully_staffed: false,
          },
        ],
      };
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: zeroResponse, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 3 hadir/i)).toBeInTheDocument();
    });

    it('should use total_assigned as required when total_required is 0', () => {
      const zeroRequiredResponse: StaffingSummaryResponse = {
        generated_at: '2026-03-08T06:00:00Z',
        items: [
          {
            id: 'area-1',
            name: 'Taman Bungkul',
            type: 'area',
            roles: [
              {
                role: 'satgas',
                active: 2,
                offline: 0,
                absent: 0,
                outside_area: 0,
                total_assigned: 2,
                total_required: 0, // should fall back to total_assigned
              },
            ],
            total_active: 2,
            total_offline: 0,
            total_absent: 0,
            total_outside_area: 0,
            is_fully_staffed: true,
          },
        ],
      };
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: zeroRequiredResponse, isSuccess: true })
      );
      render(<StaffingSummaryCard filters={areaFilters} boundaries={MOCK_BOUNDARIES} />);
      // required falls back to total_assigned(2); present=2 → "2/2"
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    it('should pass correct location_id filter to useStaffingSummary hook', () => {
      mockUseStaffingSummary.mockReturnValue(buildHookReturn());
      render(<StaffingSummaryCard filters={{ location_id: 'area-1' }} boundaries={MOCK_BOUNDARIES} />);
      expect(mockUseStaffingSummary).toHaveBeenCalledWith({ location_id: 'area-1' });
    });
  });

  // -------------------------------------------------------------------------
  // location_id takes precedence over district_id
  // -------------------------------------------------------------------------

  describe('Filter precedence', () => {
    it('should render area view (not district view) when both district_id and location_id are present', () => {
      mockUseStaffingSummary.mockReturnValue(
        buildHookReturn({ data: MOCK_STAFFING_RESPONSE, isSuccess: true })
      );
      render(
        <StaffingSummaryCard
          filters={{ district_id: 'district-1', location_id: 'area-1' }}
          boundaries={MOCK_BOUNDARIES}
        />
      );
      // Area view shows overall attendance; district view shows "Taman Bungkul" as area button
      expect(screen.getByText(/hadir/i)).toBeInTheDocument();
      // The district-view area buttons are driven differently from the area-view attendance display
      expect(screen.queryByText(/data rayon tidak tersedia/i)).not.toBeInTheDocument();
    });
  });
});
