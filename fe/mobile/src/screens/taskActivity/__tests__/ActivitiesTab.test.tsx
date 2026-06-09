import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivitiesTab } from '../tabs/ActivitiesTab';

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

const BASE_PROPS = {
  activities: [],
  loadingActivities: false,
  isLoadingMore: false,
  hasMore: false,
  activitiesError: null,
  refreshing: false,
  onRefresh: () => {},
  onRetry: () => {},
  onLoadMore: () => {},
  onNavigateToActivity: () => {},
};

describe('ActivitiesTab', () => {
  it('renders loading state with skeleton', () => {
    const { queryByText } = render(
      <ActivitiesTab {...BASE_PROPS} loadingActivities={true} />
    );
    // When loading, shows skeleton (does not render empty state)
    expect(queryByText('Belum ada aktivitas')).toBeFalsy();
  });

  it('renders empty state when no activities', () => {
    const { getByText } = render(
      <ActivitiesTab {...BASE_PROPS} />
    );
    expect(getByText('Belum ada aktivitas')).toBeTruthy();
  });

  it('renders error state with retry button', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(
      <ActivitiesTab
        {...BASE_PROPS}
        activitiesError="Gagal memuat aktivitas. Silakan coba lagi."
        onRetry={mockRetry}
      />
    );
    expect(getByText('Gagal memuat aktivitas. Silakan coba lagi.')).toBeTruthy();
    expect(getByText('Coba Lagi')).toBeTruthy();
  });
});
