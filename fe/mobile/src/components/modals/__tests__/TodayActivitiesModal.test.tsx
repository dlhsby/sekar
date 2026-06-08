/**
 * TodayActivitiesModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TodayActivitiesModal } from '../TodayActivitiesModal';
import type { Activity } from '../../../types/models.types';

describe('TodayActivitiesModal', () => {
  const mockOnClose = jest.fn();
  const mockOnActivityPress = jest.fn();

  const mockActivities: Activity[] = [
    {
      id: '1',
      user_id: 'user1',
      shift_id: 'shift1',
      activity_type_id: 'type1',
      description: 'Membersihkan taman',
      photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      area_id: 'area1',
      created_at: '2026-02-15T10:30:00Z',
      updated_at: '2026-02-15T10:30:00Z',
      activityType: {
        id: 'type1',
        name: 'Pemeliharaan',
        code: 'maintenance',
        description: 'Kegiatan pemeliharaan taman',
        applicable_roles: ['satgas'],
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      area: {
        id: 'area1',
        name: 'Taman Bungkul',
        area_type_id: 'type1',
        rayon_id: 'rayon1',
        gps_lat: -7.250445,
        gps_lng: 112.768845,
        radius_meters: 100,
        address: 'Jl. Raya Darmo',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    },
    {
      id: '2',
      user_id: 'user1',
      shift_id: 'shift1',
      activity_type_id: 'type2',
      description: 'Menyiram tanaman',
      photo_urls: [],
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      area_id: 'area1',
      created_at: '2026-02-15T14:00:00Z',
      updated_at: '2026-02-15T14:00:00Z',
      activityType: {
        id: 'type2',
        name: 'Penyiraman',
        code: 'watering',
        description: 'Kegiatan penyiraman',
        applicable_roles: ['satgas'],
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      // NBModal renders the title in uppercase.
      expect(getByText(`Aktivitas Hari Ini (${mockActivities.length})`)).toBeTruthy();
    });

    it('should not render content when visible is false', () => {
      const { queryByText } = render(
        <TodayActivitiesModal
          visible={false}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(queryByText('Aktivitas Hari Ini (2)')).toBeNull();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByLabelText('Tutup')).toBeTruthy();
    });

    it('should display activity count in header', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('Aktivitas Hari Ini (2)')).toBeTruthy();
    });

    it('should display today date in subtitle', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      // Checks for date string presence (format depends on dateUtils)
      const dateElements = getByText(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
      expect(dateElements).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no activities', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={[]}
        />
      );

      expect(getByText('Belum ada aktivitas hari ini')).toBeTruthy();
      expect(getByText('Aktivitas yang Anda buat akan muncul di sini')).toBeTruthy();
    });
  });

  describe('Activity Cards', () => {
    it('should render all activities', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('Membersihkan taman')).toBeTruthy();
      expect(getByText('Menyiram tanaman')).toBeTruthy();
    });

    it('should display activity type badge', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('Pemeliharaan')).toBeTruthy();
      expect(getByText('Penyiraman')).toBeTruthy();
    });

    it('should display area name when available', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display photo count when photos exist', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('2 foto')).toBeTruthy();
    });

    it('should not display photo count when no photos', () => {
      const { queryByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={[mockActivities[1]]}
        />
      );

      expect(queryByText('0 foto')).toBeNull();
    });

    it('should handle activity with different description', () => {
      const activityWithDifferentDesc: Activity = {
        ...mockActivities[0],
        description: 'Kegiatan khusus',
      };

      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={[activityWithDifferentDesc]}
        />
      );

      expect(getByText('Kegiatan khusus')).toBeTruthy();
    });

    it('should handle activity without area', () => {
      const activityWithoutArea: Activity = {
        ...mockActivities[0],
        area: undefined,
      };

      const { queryByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={[activityWithoutArea]}
        />
      );

      expect(queryByText('Taman Bungkul')).toBeNull();
    });
  });

  describe('Activity Press Handler', () => {
    it('should call onActivityPress when activity card is pressed', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
          onActivityPress={mockOnActivityPress}
        />
      );

      const activityCard = getByText('Membersihkan taman');
      fireEvent.press(activityCard);

      expect(mockOnActivityPress).toHaveBeenCalledWith(mockActivities[0]);
    });

    it('should not crash when onActivityPress is not provided', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      const activityCard = getByText('Membersihkan taman');
      expect(() => fireEvent.press(activityCard)).not.toThrow();
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByLabelText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      const closeButton = getByLabelText('Tutup');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByLabelText('Tutup')).toBeTruthy();
      expect(getByLabelText('Lihat detail aktivitas Pemeliharaan')).toBeTruthy();
    });

    it('should have accessibility role button for activity cards', () => {
      const { getByLabelText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
          onActivityPress={mockOnActivityPress}
        />
      );

      const activityCard = getByLabelText('Lihat detail aktivitas Pemeliharaan');
      expect(activityCard.props.accessibilityRole).toBe('button');
    });
  });

  describe('Badge Colors', () => {
    it('should use activity type name for badge text', () => {
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('Pemeliharaan')).toBeTruthy();
      expect(getByText('Penyiraman')).toBeTruthy();
    });

    it('should use default badge when no activity type', () => {
      const activityWithoutType: Activity = {
        ...mockActivities[0],
        activityType: undefined,
      };

      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={[activityWithoutType]}
        />
      );

      expect(getByText('Aktivitas')).toBeTruthy();
    });
  });

  describe('Platform Specific', () => {
    it('should render modal content inside overlay', () => {
      // The inner View uses onStartShouldSetResponder={true} to prevent tap propagation
      // to the overlay Pressable — this is a device-level responder system behavior
      // that cannot be reliably unit-tested; it is verified via manual/E2E testing.
      const { getByText } = render(
        <TodayActivitiesModal
          visible={true}
          onClose={mockOnClose}
          activities={mockActivities}
        />
      );

      expect(getByText('Aktivitas Hari Ini (2)')).toBeTruthy();
    });
  });
});
