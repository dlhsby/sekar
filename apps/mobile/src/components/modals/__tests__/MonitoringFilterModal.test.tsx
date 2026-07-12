/**
 * MonitoringFilterModal Component Tests
 * Phase 2D + Phase 4 M3 (CP6c): Full-screen filter modal for map monitoring.
 * Tests rendering, the Lokasi (location-axis) select, rayon/area pickers
 * (role-gated), role chips, search input, reset, apply, and filter sync.
 * CP6c moved status (activity) onto the peek chips; the wrench filters by
 * LOCATION (Dalam area / Luar area) instead.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { MonitoringFilterModal } from '../MonitoringFilterModal';
import type { MonitoringFilters } from '../../../types/api.types';
import type { User } from '../../../types/models.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

jest.mock('../../../services/api', () => ({
  getRayons: jest.fn().mockResolvedValue({ data: [] }),
  getAreas: jest.fn().mockResolvedValue({ data: { areas: [] } }),
  getAreasByRayonId: jest.fn().mockResolvedValue({ data: [] }),
}));

jest.mock('../../../services/api/monitoringApi', () => ({
  getStaffingSummary: jest.fn().mockResolvedValue({ data: { items: [] } }),
}));

// NBSelect, NBButton, NBText render minimal stubs so option/value/button interaction is testable
jest.mock('../../nb', () => ({
  NBSelect: (props: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    const isMulti = props.selectedValues !== undefined && props.onValuesChange !== undefined;
    return React.createElement(
      View,
      { testID: `select-${props.placeholder}` },
      React.createElement(Text, null, props.placeholder),
      // Render option buttons — multi-select toggles in/out, single-select calls onValueChange
      ...(props.options ?? []).map((opt: any) =>
        React.createElement(
          TouchableOpacity,
          {
            key: opt.value,
            testID: `option-${opt.value}`,
            onPress: () => {
              if (isMulti) {
                const cur: string[] = props.selectedValues ?? [];
                const next = cur.includes(opt.value)
                  ? cur.filter((v: string) => v !== opt.value)
                  : [...cur, opt.value];
                props.onValuesChange(next);
              } else if (props.onValueChange) {
                props.onValueChange(opt.value);
              }
            },
          },
          React.createElement(Text, null, opt.label),
        ),
      ),
    );
  },
  NBButton: (props: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { onPress: props.onPress, disabled: props.disabled, ...props },
      React.createElement(Text, null, props.title || props.label || props.children),
    );
  },
  NBModal: (props: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    if (!props.visible) {
      return null;
    }
    return React.createElement(
      View,
      { testID: 'nb-modal' },
      React.createElement(
        View,
        { testID: 'modal-header' },
        props.title && React.createElement(Text, null, props.title),
        props.headerRight && React.createElement(View, { testID: 'header-right' }, props.headerRight),
      ),
      React.createElement(View, null, props.children),
      props.footer && React.createElement(View, { testID: 'modal-footer' }, props.footer),
    );
  },
}));

jest.mock('../../nb/NBText', () => ({
  NBText: (props: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { ...props }, props.children);
  },
}));

import { getRayons, getAreas, getAreasByRayonId } from '../../../services/api';
import { getStaffingSummary } from '../../../services/api/monitoringApi';

const mockGetRayons = getRayons as jest.Mock;
const mockGetAreas = getAreas as jest.Mock;
const mockGetAreasByRayonId = getAreasByRayonId as jest.Mock;
const mockGetStaffingSummary = getStaffingSummary as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSuperadmin: User = {
  id: 'user-1',
  username: 'superadmin',
  full_name: 'Super Admin',
  role: 'superadmin',
  rayon_id: undefined,
  rayon: undefined,
  area_id: undefined,
  area: undefined,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockKorlap: User = {
  ...mockSuperadmin,
  id: 'user-2',
  username: 'korlap1',
  full_name: 'Korlap 1',
  role: 'korlap',
  area_id: 'area-1',
};

const mockKepalaRayon: User = {
  ...mockSuperadmin,
  id: 'user-3',
  username: 'kr1',
  full_name: 'Kepala Rayon 1',
  role: 'kepala_rayon',
  rayon_id: 'rayon-1',
  rayon: {
    id: 'rayon-1',
    name: 'Rayon 1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

const mockTopManagement: User = {
  ...mockSuperadmin,
  id: 'user-4',
  username: 'top1',
  full_name: 'Top Management',
  role: 'management',
};

const emptyFilters: MonitoringFilters = {};

function buildDefaultProps(overrides?: {
  visible?: boolean;
  currentUser?: User;
  currentFilters?: MonitoringFilters;
  onClose?: jest.Mock;
  onApply?: jest.Mock;
}) {
  return {
    visible: overrides?.visible ?? true,
    onClose: overrides?.onClose ?? jest.fn(),
    onApply: overrides?.onApply ?? jest.fn(),
    currentFilters: overrides?.currentFilters ?? emptyFilters,
    currentUser: overrides?.currentUser ?? mockSuperadmin,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MonitoringFilterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRayons.mockResolvedValue({ data: [] });
    mockGetAreas.mockResolvedValue({ data: { areas: [] } });
    mockGetAreasByRayonId.mockResolvedValue({ data: [] });
    mockGetStaffingSummary.mockResolvedValue({ data: { items: [] } });
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders modal content when visible is true', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ visible: true })} />
      );
      await waitFor(() => {
        expect(getByText('Filter Monitoring')).toBeTruthy();
      });
    });

    it('does not render modal content when visible is false', () => {
      const { queryByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ visible: false })} />
      );
      expect(queryByText('Filter Monitoring')).toBeNull();
    });
  });

  // ── Header ──────────────────────────────────────────────────────────────────

  describe('header', () => {
    it('shows "Filter Monitoring" title', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} />
      );
      await waitFor(() => {
        expect(getByText('Filter Monitoring')).toBeTruthy();
      });
    });

    it('shows a Reset button in the header', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} />
      );
      await waitFor(() => {
        expect(getByText('Reset')).toBeTruthy();
      });
    });
  });

  // ── Lokasi (location axis) select ─────────────────────────────────────────────

  describe('location filter', () => {
    it('renders the Lokasi section with both location options', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} />
      );
      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
        expect(getByText('Dalam area')).toBeTruthy();
        expect(getByText('Luar area')).toBeTruthy();
      });
    });

    it('applies the selected locations under the `location` key', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} />
      );
      await waitFor(() => expect(getByText('Dalam area')).toBeTruthy());

      fireEvent.press(getByText('Dalam area'));
      fireEvent.press(getByText('Luar area'));
      fireEvent.press(getByText('Terapkan'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.arrayContaining(['dalam_area', 'luar_area']),
        })
      );
    });

    it('deselects a location when pressed a second time', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} />
      );
      await waitFor(() => expect(getByText('Dalam area')).toBeTruthy());

      fireEvent.press(getByText('Dalam area'));
      fireEvent.press(getByText('Dalam area')); // deselect
      fireEvent.press(getByText('Terapkan'));

      const calledWith = onApply.mock.calls[0][0] as MonitoringFilters;
      expect(calledWith.location).toBeUndefined();
    });
  });

  // ── Rayon picker (role-gated) ───────────────────────────────────────────────

  describe('rayon picker - role gating', () => {
    it('superadmin sees rayon select picker', async () => {
      const { getByTestId } = render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockSuperadmin })} />
      );
      await waitFor(() => {
        expect(getByTestId('select-Pilih Rayon')).toBeTruthy();
      });
    });

    it('management sees rayon select picker', async () => {
      const { getByTestId } = render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockTopManagement })} />
      );
      await waitFor(() => {
        expect(getByTestId('select-Pilih Rayon')).toBeTruthy();
      });
    });

    it('korlap does NOT see rayon picker (hideRayon)', async () => {
      const { queryByTestId } = render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockKorlap })} />
      );
      await waitFor(() => {
        expect(queryByTestId('select-Pilih Rayon')).toBeNull();
      });
    });

    it('kepala_rayon sees a locked/fixed rayon display (not a picker)', async () => {
      const { queryByTestId, getByText } = render(
        <MonitoringFilterModal
          {...buildDefaultProps({ currentUser: mockKepalaRayon })}
        />
      );
      await waitFor(() => {
        // NBSelect stub (Pilih Rayon) should NOT appear
        expect(queryByTestId('select-Pilih Rayon')).toBeNull();
        // Fixed rayon name or fallback text should be shown
        expect(getByText(/Rayon 1|Rayon Anda/)).toBeTruthy();
      });
    });

    it('loads rayon list via getRayons for roles with rayon access', async () => {
      render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockSuperadmin })} />
      );
      await waitFor(() => {
        expect(mockGetRayons).toHaveBeenCalled();
      });
    });

    it('does NOT call getRayons for korlap', async () => {
      render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockKorlap })} />
      );
      await waitFor(() => {
        expect(mockGetRayons).not.toHaveBeenCalled();
      });
    });
  });

  // ── Area picker ─────────────────────────────────────────────────────────────

  describe('area picker', () => {
    it('always renders area select for superadmin', async () => {
      const { getByTestId } = render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockSuperadmin })} />
      );
      await waitFor(() => {
        expect(getByTestId('select-Pilih Area')).toBeTruthy();
      });
    });

    it('always renders area select for korlap', async () => {
      const { getByTestId } = render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockKorlap })} />
      );
      await waitFor(() => {
        expect(getByTestId('select-Pilih Area')).toBeTruthy();
      });
    });

    it('loads all areas via getAreas when no rayon is selected and user is not kepala_rayon', async () => {
      render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockSuperadmin })} />
      );
      await waitFor(() => {
        expect(mockGetAreas).toHaveBeenCalled();
      });
    });

    it('loads areas by rayon via getAreasByRayonId when kepala_rayon opens modal', async () => {
      render(
        <MonitoringFilterModal {...buildDefaultProps({ currentUser: mockKepalaRayon })} />
      );
      await waitFor(() => {
        expect(mockGetAreasByRayonId).toHaveBeenCalledWith('rayon-1');
      });
    });
  });

  // ── Role chips ──────────────────────────────────────────────────────────────

  describe('role filter chips', () => {
    it('renders Satgas role chip', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} />
      );
      await waitFor(() => {
        expect(getByText('Satgas')).toBeTruthy();
      });
    });

    it('renders Linmas role chip', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} />
      );
      await waitFor(() => {
        expect(getByText('Linmas')).toBeTruthy();
      });
    });

    it('renders Korlap role chip', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} />
      );
      await waitFor(() => {
        expect(getByText('Korlap')).toBeTruthy();
      });
    });

    it('selecting a role chip includes role in applied filters', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} />
      );
      await waitFor(() => expect(getByText('Satgas')).toBeTruthy());

      fireEvent.press(getByText('Satgas'));
      fireEvent.press(getByText('Terapkan'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'satgas' })
      );
    });

    it('pressing the same role chip twice deselects it', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} />
      );
      await waitFor(() => expect(getByText('Satgas')).toBeTruthy());

      fireEvent.press(getByText('Satgas'));
      fireEvent.press(getByText('Satgas')); // deselect
      fireEvent.press(getByText('Terapkan'));

      const calledWith = onApply.mock.calls[0][0] as MonitoringFilters;
      expect(calledWith.role).toBeUndefined();
    });
  });

  // ── Search input ────────────────────────────────────────────────────────────

  describe('search input', () => {
    // Phase 4 M3: "Cari Pengguna" is now a searchable NBSelect over the live
    // users, not a free-text field. Its trigger shows the placeholder until a
    // user is picked; the picked name is sent as the `search` filter.
    const searchUsers = [
      { id: 'u1', full_name: 'Ahmad Satgas', role: 'satgas' },
      { id: 'u2', full_name: 'Budi Linmas', role: 'linmas' },
    ] as any;

    it('renders the Cari Pengguna search select', async () => {
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps()} users={searchUsers} />
      );
      await waitFor(() => {
        expect(getByText('Cari Pengguna')).toBeTruthy();
        expect(getByText('Pilih pengguna')).toBeTruthy();
      });
    });

    it('includes the picked user in applied filters', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} users={searchUsers} />
      );
      await waitFor(() => expect(getByText('Pilih pengguna')).toBeTruthy());

      // Open the select, pick a user, then apply.
      fireEvent.press(getByText('Pilih pengguna'));
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Terapkan'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Ahmad Satgas' })
      );
    });

    it('does not include search key in applied filters when input is empty', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} />
      );
      await waitFor(() => expect(getByText('Terapkan')).toBeTruthy());

      fireEvent.press(getByText('Terapkan'));

      const calledWith = onApply.mock.calls[0][0] as MonitoringFilters;
      expect(calledWith.search).toBeUndefined();
    });
  });

  // ── Reset ───────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all filter selections when Reset is pressed', async () => {
      const onApply = jest.fn();
      const resetUsers = [{ id: 'u1', full_name: 'Ahmad Satgas', role: 'satgas' }] as any;
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} users={resetUsers} />
      );
      await waitFor(() => expect(getByText('Dalam area')).toBeTruthy());

      // Select some filters first
      fireEvent.press(getByText('Dalam area'));
      fireEvent.press(getByText('Satgas'));
      fireEvent.press(getByText('Pilih pengguna'));
      fireEvent.press(getByText('Ahmad Satgas'));

      // Reset
      fireEvent.press(getByText('Reset'));

      // Apply and assert empty filters
      fireEvent.press(getByText('Terapkan'));
      const calledWith = onApply.mock.calls[0][0] as MonitoringFilters;
      expect(calledWith.location).toBeUndefined();
      expect(calledWith.role).toBeUndefined();
      expect(calledWith.search).toBeUndefined();
    });
  });

  // ── Apply ───────────────────────────────────────────────────────────────────

  describe('apply', () => {
    it('calls onApply with selected filters when Terapkan is pressed', async () => {
      const onApply = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onApply })} />
      );
      await waitFor(() => expect(getByText('Dalam area')).toBeTruthy());

      fireEvent.press(getByText('Dalam area'));
      fireEvent.press(getByText('Terapkan'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ location: ['dalam_area'] })
      );
    });

    it('calls onClose after apply', async () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <MonitoringFilterModal {...buildDefaultProps({ onClose })} />
      );
      await waitFor(() => expect(getByText('Terapkan')).toBeTruthy());

      fireEvent.press(getByText('Terapkan'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Filter sync ─────────────────────────────────────────────────────────────
  // Note: back button is now handled by NBModal, tested at the NBModal component level

  describe('filter sync with currentFilters', () => {
    it('pre-selects locations from currentFilters when modal opens', async () => {
      const onApply = jest.fn();
      const currentFilters: MonitoringFilters = {
        location: ['dalam_area', 'luar_area'],
        role: 'satgas',
        search: 'Budi',
      };

      const { getByText } = render(
        <MonitoringFilterModal
          {...buildDefaultProps({ onApply, currentFilters })}
        />
      );
      await waitFor(() => expect(getByText('Terapkan')).toBeTruthy());

      // Without any interaction, applying should include the pre-selected filters
      fireEvent.press(getByText('Terapkan'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.arrayContaining(['dalam_area', 'luar_area']),
          role: 'satgas',
          search: 'Budi',
        })
      );
    });

    it('re-syncs with new currentFilters when visible changes to true', async () => {
      const onApply = jest.fn();
      const initialFilters: MonitoringFilters = { location: ['dalam_area'] };

      const { rerender, getByText } = render(
        <MonitoringFilterModal
          {...buildDefaultProps({ visible: false, currentFilters: initialFilters })}
        />
      );

      const updatedFilters: MonitoringFilters = { location: ['luar_area'] };

      await act(async () => {
        rerender(
          <MonitoringFilterModal
            {...buildDefaultProps({
              visible: true,
              onApply,
              currentFilters: updatedFilters,
            })}
          />
        );
      });

      await waitFor(() => expect(getByText('Terapkan')).toBeTruthy());
      fireEvent.press(getByText('Terapkan'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ location: ['luar_area'] })
      );
    });
  });
});
