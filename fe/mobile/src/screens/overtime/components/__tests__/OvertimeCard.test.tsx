/**
 * OvertimeCard Component Tests
 * Tests the extracted OvertimeCard component from OvertimeListScreen.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OvertimeCard } from '../OvertimeCard';
import type { Overtime } from '../../../../types/models.types';

// ─── Fixture data ─────────────────────────────────────────────────────────────

const BASE_OVERTIME: Overtime = {
  id: 'ot-1',
  description: 'Perawatan taman malam hari',
  status: 'pending',
  start_datetime: '2026-02-14T18:00:00.000Z',
  end_datetime: '2026-02-14T21:00:00.000Z',
  created_at: '2026-02-14T17:00:00.000Z',
  updated_at: '2026-02-14T17:00:00.000Z',
  activityType: { id: 'at-1', name: 'Pemeliharaan' } as any,
  area: { id: 'area-1', name: 'Taman Bungkul' } as any,
  user: { id: 'u-1', full_name: 'Budi Santoso', role: 'satgas' } as any,
  photo_urls: ['https://example.com/photo1.jpg'],
} as unknown as Overtime;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OvertimeCard', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() =>
        render(<OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />),
      ).not.toThrow();
    });

    it('renders the activity type name as primary heading', () => {
      const { getByText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByText('Pemeliharaan')).toBeTruthy();
    });

    it('falls back to "Lembur" when activityType is null', () => {
      const overtime = { ...BASE_OVERTIME, activityType: null };
      const { getByText } = render(
        <OvertimeCard overtime={overtime as any} onPress={() => {}} />,
      );
      expect(getByText('Lembur')).toBeTruthy();
    });

    it('renders the description text', () => {
      const { getByText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByText('Perawatan taman malam hari')).toBeTruthy();
    });

    it('does not render description section when description is absent', () => {
      const overtime = { ...BASE_OVERTIME, description: undefined };
      const { queryByText } = render(
        <OvertimeCard overtime={overtime as any} onPress={() => {}} />,
      );
      expect(queryByText('Perawatan taman malam hari')).toBeNull();
    });
  });

  describe('Status badge', () => {
    // NBBadge renders text in UPPERCASE and exposes an accessibilityLabel
    // in the form "<color> badge: <label>". We assert via getByLabelText.

    it('renders the status badge for pending with correct accessibility label', () => {
      const { getByLabelText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      // getOvertimeStatusLabel('pending') → 'Menunggu', color → 'warning'
      expect(getByLabelText('warning badge: Menunggu')).toBeTruthy();
    });

    it('renders the status badge for approved with correct accessibility label', () => {
      const overtime = { ...BASE_OVERTIME, status: 'approved' } as Overtime;
      const { getByLabelText } = render(
        <OvertimeCard overtime={overtime} onPress={() => {}} />,
      );
      // getOvertimeStatusLabel('approved') → 'Disetujui', color → 'success'
      expect(getByLabelText('success badge: Disetujui')).toBeTruthy();
    });

    it('renders the status badge for rejected with correct accessibility label', () => {
      const overtime = { ...BASE_OVERTIME, status: 'rejected' } as Overtime;
      const { getByLabelText } = render(
        <OvertimeCard overtime={overtime} onPress={() => {}} />,
      );
      // getOvertimeStatusLabel('rejected') → 'Ditolak', color → 'danger'
      expect(getByLabelText('danger badge: Ditolak')).toBeTruthy();
    });
  });

  describe('Area chip', () => {
    it('renders area name in meta chips', () => {
      const { getByText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByText(/Taman Bungkul/)).toBeTruthy();
    });

    it('does not render area chip when area is null', () => {
      const overtime = { ...BASE_OVERTIME, area: null };
      const { queryByText } = render(
        <OvertimeCard overtime={overtime as any} onPress={() => {}} />,
      );
      expect(queryByText(/Taman Bungkul/)).toBeNull();
    });
  });

  describe('Creator row', () => {
    it('renders the creator full name', () => {
      const { getByText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByText(/Budi Santoso/)).toBeTruthy();
    });

    it('renders the creator role', () => {
      const { getByText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByText(/satgas/)).toBeTruthy();
    });

    it('does not render creator row when user is null', () => {
      const overtime = { ...BASE_OVERTIME, user: null };
      const { queryByText } = render(
        <OvertimeCard overtime={overtime as any} onPress={() => {}} />,
      );
      expect(queryByText(/Budi Santoso/)).toBeNull();
    });
  });

  describe('Photo count chip', () => {
    it('renders photo count chip when photos are present', () => {
      const { getByText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByText(/1 foto/)).toBeTruthy();
    });

    it('does not render photo chip when photo_urls is empty', () => {
      const overtime = { ...BASE_OVERTIME, photo_urls: [] };
      const { queryByText } = render(
        <OvertimeCard overtime={overtime as any} onPress={() => {}} />,
      );
      expect(queryByText(/foto/)).toBeNull();
    });

    it('shows correct count for multiple photos', () => {
      const overtime = {
        ...BASE_OVERTIME,
        photo_urls: ['url1', 'url2', 'url3'],
      };
      const { getByText } = render(
        <OvertimeCard overtime={overtime as any} onPress={() => {}} />,
      );
      expect(getByText(/3 foto/)).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when the card is tapped', () => {
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={onPress} />,
      );

      fireEvent.press(getByLabelText('Detail lembur Pemeliharaan'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress with correct context when activity type falls back to "Lembur"', () => {
      const onPress = jest.fn();
      const overtime = { ...BASE_OVERTIME, activityType: null };
      const { getByLabelText } = render(
        <OvertimeCard overtime={overtime as any} onPress={onPress} />,
      );

      fireEvent.press(getByLabelText('Detail lembur Lembur'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has an accessibility label matching the activity type name', () => {
      const { getByLabelText } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      expect(getByLabelText('Detail lembur Pemeliharaan')).toBeTruthy();
    });

    it('has accessibilityRole of button on the card touchable', () => {
      const { getAllByRole } = render(
        <OvertimeCard overtime={BASE_OVERTIME} onPress={() => {}} />,
      );
      // The outer TouchableOpacity has accessibilityRole="button"
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
