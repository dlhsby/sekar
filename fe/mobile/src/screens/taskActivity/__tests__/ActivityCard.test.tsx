import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityCard } from '../components/ActivityCard';
import type { Activity } from '../../../types/models.types';

const BASE_ACTIVITY: Activity = {
  id: 'act-1',
  description: 'Menyapu halaman depan',
  status: 'pending',
  created_at: '2026-02-22T09:30:00Z',
  updated_at: '2026-02-22T09:30:00Z',
  activityType: { id: 'type-1', name: 'Kebersihan' } as any,
  area: { id: 'area-1', name: 'Area B' } as any,
  photo_urls: [],
} as unknown as Activity;

describe('ActivityCard', () => {
  it('renders activity type name', () => {
    const { getByText } = render(<ActivityCard activity={BASE_ACTIVITY} onPress={() => {}} />);
    expect(getByText('Kebersihan')).toBeTruthy();
  });

  it('falls back to "Aktivitas" when no activityType', () => {
    const { getByText } = render(
      <ActivityCard activity={{ ...BASE_ACTIVITY, activityType: null } as any} onPress={() => {}} />
    );
    expect(getByText('Aktivitas')).toBeTruthy();
  });

  it('renders description when present', () => {
    const { getByText } = render(<ActivityCard activity={BASE_ACTIVITY} onPress={() => {}} />);
    expect(getByText('Menyapu halaman depan')).toBeTruthy();
  });

  it('does not render description when absent', () => {
    const { queryByText } = render(
      <ActivityCard activity={{ ...BASE_ACTIVITY, description: undefined } as any} onPress={() => {}} />
    );
    expect(queryByText('Menyapu halaman depan')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ActivityCard activity={BASE_ACTIVITY} onPress={onPress} />);
    fireEvent.press(getByText('Kebersihan'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows area name', () => {
    const { getByText } = render(<ActivityCard activity={BASE_ACTIVITY} onPress={() => {}} />);
    expect(getByText(/Area B/)).toBeTruthy();
  });

  it('does not show area chip when no area', () => {
    const { queryByText } = render(
      <ActivityCard activity={{ ...BASE_ACTIVITY, area: null } as any} onPress={() => {}} />
    );
    expect(queryByText(/Area B/)).toBeNull();
  });

  it('shows photo count when photos present', () => {
    const actWithPhotos = { ...BASE_ACTIVITY, photo_urls: ['url1', 'url2', 'url3'] } as any;
    const { getByText } = render(<ActivityCard activity={actWithPhotos} onPress={() => {}} />);
    expect(getByText(/3 foto/)).toBeTruthy();
  });

  it('does not show photo chip when no photos', () => {
    const { queryByText } = render(<ActivityCard activity={BASE_ACTIVITY} onPress={() => {}} />);
    expect(queryByText(/foto/)).toBeNull();
  });

  describe('status pill (activityPill)', () => {
    // StatusPill renders the label as its text node.
    it('shows "Disetujui" for approved status', () => {
      const { getByText } = render(
        <ActivityCard activity={{ ...BASE_ACTIVITY, status: 'approved' } as any} onPress={() => {}} />
      );
      expect(getByText('Disetujui')).toBeTruthy();
    });

    it('shows "Ditolak" for rejected status', () => {
      const { getByText } = render(
        <ActivityCard activity={{ ...BASE_ACTIVITY, status: 'rejected' } as any} onPress={() => {}} />
      );
      expect(getByText('Ditolak')).toBeTruthy();
    });

    it('shows "Menunggu" for pending status', () => {
      const { getByText } = render(
        <ActivityCard activity={{ ...BASE_ACTIVITY, status: 'pending' } as any} onPress={() => {}} />
      );
      expect(getByText('Menunggu')).toBeTruthy();
    });

    it('shows "Tercatat" when status is absent', () => {
      const { getByText } = render(
        <ActivityCard activity={{ ...BASE_ACTIVITY, status: undefined } as any} onPress={() => {}} />
      );
      expect(getByText('Tercatat')).toBeTruthy();
    });
  });

  describe('Diikutsertakan badge (ADR-038)', () => {
    it('shows badge when current user is not the activity owner (tagged in)', () => {
      const activity = { ...BASE_ACTIVITY, user_id: 'owner-1' } as any;
      const { getByLabelText } = render(
        <ActivityCard activity={activity} onPress={() => {}} currentUserId="viewer-1" />
      );
      expect(getByLabelText(/Diikutsertakan/i)).toBeTruthy();
    });

    it('does not show badge when current user is the owner', () => {
      const activity = { ...BASE_ACTIVITY, user_id: 'owner-1' } as any;
      const { queryByLabelText } = render(
        <ActivityCard activity={activity} onPress={() => {}} currentUserId="owner-1" />
      );
      expect(queryByLabelText(/Diikutsertakan/i)).toBeNull();
    });

    it('does not show badge when currentUserId is omitted', () => {
      const activity = { ...BASE_ACTIVITY, user_id: 'owner-1' } as any;
      const { queryByLabelText } = render(
        <ActivityCard activity={activity} onPress={() => {}} />
      );
      expect(queryByLabelText(/Diikutsertakan/i)).toBeNull();
    });
  });
});
