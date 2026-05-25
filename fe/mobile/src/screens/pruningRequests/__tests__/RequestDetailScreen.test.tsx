/**
 * Pruning Request Detail Screen Tests
 * Phase 3 sub-phase 3-10
 */

// Heavy navigation + Redux + bottom-sheet stack; the default 30 s per-test
// budget is too tight on slower CI runners and triggers spurious timeouts
// in waitFor blocks. Bumped per-file rather than globally.
jest.setTimeout(60000);

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Mock navigation hooks FIRST - before components use them
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  NavigationContainer: ({ children }: any) => children,
}));

// Mock nbTokens FIRST - before any NB components are imported
jest.mock('../../../constants/nbTokens', () => ({
  nbColors: {
    bgCanvas: '#F5F0EB',
    bgSurface: '#FFFFFF',
    bgOverlay: 'rgba(0,0,0,0.5)',
    bgDefault: '#FFFFFF',
    black: '#1C1917',
    white: '#FFFFFF',
    gray50: '#FAFAF9',
    gray100: '#F5F5F4',
    gray200: '#E7E5E4',
    gray300: '#D6D3D1',
    gray400: '#A8A29E',
    gray500: '#78716C',
    gray600: '#57534E',
    gray700: '#44403C',
    gray800: '#292524',
    gray900: '#1C1917',
    primary: '#7FBC8C',
    secondary: '#8B7355',
    info: '#69D2E7',
    success: '#7FBC8C',
    danger: '#FF6B6B',
    warning: '#E3A018',
    plantOk: '#15803D',
    plantDue: '#D97706',
    plantOverdue: '#DC2626',
    statusActive: '#15803D',
    statusIdle: '#D97706',
    statusMissing: '#DC2626',
    statusOffline: '#6B7280',
    requestSubmitted: '#6B7280',
    requestUnderReview: '#2563EB',
    requestApproved: '#15803D',
    requestRejected: '#DC2626',
    requestConverted: '#7C3AED',
    requestInProgress: '#D97706',
    requestDone: '#16A34A',
    warningLight: '#FFDB58',
    accentSky: '#69D2E7',
    accentGrass: '#7FBC8C',
    accentSunshine: '#FFDB58',
    accentEarth: '#8B7355',
    // Semantic color structures expected by RequestDetailScreen
    textDefault: '#1C1917',
    textSecondary: '#57534E',
    textTertiary: '#78716C',
    bgSecondary: '#E7E5E4',
  },
  nbSpacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    0: 0,
    1: 4,
    2: 8,
    3: 16,
    4: 24,
    5: 32,
    6: 48,
  } as any,
  nbBorders: {
    color: '#1C1917',
    style: 'solid',
    widthThin: 1,
    widthBase: 2,
    widthThick: 3,
    widthExtra: 4,
  },
  nbRadius: {
    none: 0,
    sm: 4,
    base: 6,
    md: 8,
    lg: 12,
    full: 9999,
  },
  nbBorderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  nbShadows: {
    none: { elevation: 0, shadowColor: 'transparent', shadowOffset: { height: 0, width: 0 }, shadowOpacity: 1, shadowRadius: 0 },
    xs: { elevation: 2, shadowColor: '#1C1917', shadowOffset: { height: 2, width: 2 }, shadowOpacity: 1, shadowRadius: 0 },
    sm: { elevation: 4, shadowColor: '#1C1917', shadowOffset: { height: 4, width: 4 }, shadowOpacity: 1, shadowRadius: 0 },
    md: { elevation: 6, shadowColor: '#1C1917', shadowOffset: { height: 6, width: 6 }, shadowOpacity: 1, shadowRadius: 0 },
    lg: { elevation: 8, shadowColor: '#1C1917', shadowOffset: { height: 8, width: 8 }, shadowOpacity: 1, shadowRadius: 0 },
    active: { elevation: 2, shadowColor: '#1C1917', shadowOffset: { height: 2, width: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  },
  nbTypography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 36,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    fontFamily: {
      sans: 'Inter',
      display: 'Space Grotesk',
      mono: 'JetBrains Mono',
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  withAlpha: (color: string, alpha: number) => {
    if (alpha < 0 || alpha > 1) {
      alpha = Math.max(0, Math.min(1, alpha));
    }
    const hex = color.replace('#', '');
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return `rgba(0, 0, 0, ${alpha})`;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
}));

// Mock NB components AFTER nbTokens
jest.mock('../../../components/nb', () => {
  const React = require('react');
  const { TouchableOpacity, Text, TextInput, View, ActivityIndicator } = require('react-native');

  const NBButton = ({ label, title, children, onPress, testID, accessibilityLabel, disabled, ...props }: any) => {
    let content = children;
    const buttonText = label || title;
    if (!content && buttonText) {
      content = React.createElement(Text, {}, buttonText);
    }
    return React.createElement(
      TouchableOpacity,
      { onPress, testID, accessibilityLabel, disabled, ...props },
      content
    );
  };

  const NBCard = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  const NBCardHeader = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  const NBCardContent = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  const NBCardTextInput = ({ placeholder, onChangeText, testID, value, ...props }: any) =>
    React.createElement(TextInput, {
      placeholder,
      onChangeText,
      testID,
      value,
      ...props,
    });

  const NBAlert = ({ message, title, children, variant, ...props }: any) => {
    const content = [];
    if (title) {
      content.push(React.createElement(Text, { key: 'title' }, title));
    }
    if (message) {
      content.push(React.createElement(Text, { key: 'message' }, message));
    } else if (children) {
      content.push(React.createElement(Text, { key: 'children' }, children));
    }
    return React.createElement(View, props, ...content);
  };

  const NBModal = ({ visible, children, ...props }: any) =>
    visible ? React.createElement(View, props, children) : null;

  const NBText = ({ children, variant, ...props }: any) =>
    React.createElement(Text, props, children);

  const NBBadge = ({ children, variant, text, label, ...props }: any) => {
    const content = text || label || children;
    return React.createElement(
      View,
      props,
      content ? React.createElement(Text, {}, content) : null
    );
  };

  const NBEmptyState = ({ title, description, action, children, ...props }: any) => {
    const content = [];
    if (title) {
      content.push(React.createElement(Text, { key: 'title' }, title));
    }
    if (description) {
      content.push(React.createElement(Text, { key: 'description' }, description));
    }
    if (action?.label) {
      content.push(React.createElement(Text, { key: 'action' }, action.label));
    }
    if (children) {
      content.push(children);
    }
    return React.createElement(View, props, ...content);
  };

  const NBTab = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  const NBSelect = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  const NBTextInput = ({ placeholder, onChangeText, testID, value, ...props }: any) =>
    React.createElement(TextInput, {
      placeholder,
      onChangeText,
      testID,
      value,
      ...props,
    });

  const NBDatePicker = ({ ...props }: any) =>
    React.createElement(Text, props, 'Date Picker');

  const NBBackgroundPattern = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  return {
    NBButton,
    NBCard,
    NBCardHeader,
    NBCardContent,
    NBCardTextInput,
    NBAlert,
    NBModal,
    NBText,
    NBBadge,
    NBEmptyState,
    NBTab,
    NBSelect,
    NBTextInput,
    NBDatePicker,
    NBBackgroundPattern,
  };
}
);

// Mock NBText separately for direct imports
jest.mock('../../../components/nb/NBText', () => ({
  NBText: ({ children, variant, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

// Mock LoadingSpinner
jest.mock('../../../components/common', () => ({
  LoadingSpinner: () => {
    const React = require('react');
    const { ActivityIndicator, View } = require('react-native');
    return React.createElement(View, {}, React.createElement(ActivityIndicator));
  },
}));

// Mock AssignToTaskSheet
jest.mock('../../../components/admin/AssignToTaskSheet', () => ({
  AssignToTaskSheet: ({ visible }: any) => {
    const React = require('react');
    const { Modal, View, Text } = require('react-native');
    return visible ? React.createElement(View, {}, React.createElement(Text, {}, 'Convert Sheet')) : null;
  },
}));

// Mock NBToast
jest.mock('../../../components/nb/NBToast', () => ({
  NBToast: ({ type, text1, text2, visible }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return visible ? React.createElement(View, {}, React.createElement(Text, {}, text1)) : null;
  },
}));

// Mock useUserRole hook
jest.mock('../../../hooks/useUserRole', () => ({
  useUserRole: () => 'admin_data',
}));

// Mock API
jest.mock('../../../services/api/pruningRequestsApi');

// LocationMapModal pulls in react-native-maps which doesn't load in Jest;
// stub it to a no-op so RequestDetailScreen can mount.
jest.mock('../../../components/modals/LocationMapModal', () => ({
  __esModule: true,
  LocationMapModal: () => null,
}));

// NOW import components after mocks are set up
import { RequestDetailScreen } from '../RequestDetailScreen';
import pruningRequestsReducer, {
  fetchPruningRequestById,
} from '../../../store/slices/pruningRequestsSlice';
import * as pruningRequestsApi from '../../../services/api/pruningRequestsApi';
import type { PruningRequest } from '../../../types/models.types';

describe('RequestDetailScreen', () => {
  let store: ReturnType<typeof configureStore>;

  const mockPruningRequest: PruningRequest = {
    id: 'pr-001',
    referenceCode: 'PR-2026-001',
    submittedBy: {
      id: 'user-1',
      name: 'Test User',
      role: 'staff_kecamatan',
    },
    kecamatanName: 'Surabaya Pusat',
    address: 'Jln Pemuda No. 123',
    gpsLat: -7.2575,
    gpsLng: 112.7521,
    // May 9, 2026 — `expectedDate` is the legacy single-day column (left
    // NULL going forward). Use `scheduledDate` for the admin-confirmed day
    // that the detail screen renders.
    expectedDate: null,
    scheduledDate: '2026-05-01',
    estimatedPlantCount: 15,
    photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    notes: 'Pohon sudah tua',
    status: 'submitted' as const,
    rayonId: 'rayon-1',
    rayon: {
      id: 'rayon-1',
      name: 'Rayon 1',
    },
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    assignedTaskId: null,
    convertedTask: null,
    createdAt: '2026-04-27T10:00:00Z',
    updatedAt: '2026-04-27T10:00:00Z',
  };

  const mockReviewedRequest: PruningRequest = {
    ...mockPruningRequest,
    status: 'approved' as const,
    reviewedBy: { id: 'reviewer-1', name: 'Admin', role: 'admin_data' },
    reviewedAt: '2026-04-28T10:00:00Z',
    reviewNotes: 'Lokasi sudah diverifikasi',
  };

  const mockConvertedRequest: PruningRequest = {
    ...mockPruningRequest,
    status: 'assigned' as const,
    assignedTaskId: 'task-123',
    convertedTask: { id: 'task-123', name: 'Pemangkasan Pohon' },
  };

  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
      error: null,
      data: mockPruningRequest,
    });

    store = configureStore({
      reducer: {
        auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
        pruningRequests: pruningRequestsReducer,
      },
      preloadedState: {
        auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
        pruningRequests: {
          mine: [],
          adminList: [],
          byId: {
            'pr-001': mockPruningRequest,
          },
          isLoading: false,
          error: null,
          submitStatus: 'idle',
          submitError: null,
          reviewingId: null,
          converting: {},
        },
      },
    });
  });

  const renderScreen = (requestId: string = 'pr-001') => {
    // Mock useNavigation to avoid NavigationContainer complexity
    const useNavigationMock = require('@react-navigation/native').useNavigation as jest.Mock;
    useNavigationMock.mockReturnValue(mockNavigation);

    // Mock useRoute to provide route params
    const useRouteMock = require('@react-navigation/native').useRoute as jest.Mock;
    useRouteMock.mockReturnValue({
      params: { requestId, adminMode: false },
    });

    return render(
      <Provider store={store}>
        <RequestDetailScreen
          navigation={mockNavigation as any}
          route={{ params: { requestId, adminMode: false } } as any}
        />
      </Provider>
    );
  };

  describe('Rendering and Loading', () => {
    it('should display loading spinner on initial load', () => {
      // Create a store with isLoading=true
      const loadingStore = configureStore({
        reducer: {
          auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
          pruningRequests: pruningRequestsReducer,
        },
        preloadedState: {
          auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
          pruningRequests: {
            mine: [],
            adminList: [],
            byId: {},
            isLoading: true,
            error: null,
            submitStatus: 'idle',
            submitError: null,
            reviewingId: null,
            converting: {},
          },
        },
      });

      const useNavigationMock = require('@react-navigation/native').useNavigation as jest.Mock;
      useNavigationMock.mockReturnValue(mockNavigation);
      const useRouteMock = require('@react-navigation/native').useRoute as jest.Mock;
      useRouteMock.mockReturnValue({
        params: { requestId: 'pr-001', adminMode: false },
      });

      render(
        <Provider store={loadingStore}>
          <RequestDetailScreen
            navigation={mockNavigation as any}
            route={{ params: { requestId: 'pr-001', adminMode: false } } as any}
          />
        </Provider>
      );

      expect(screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
    });

    it('should display request details when loaded', () => {
      renderScreen();

      expect(screen.getByText('PR-2026-001')).toBeTruthy();
    });

    it('should not refetch if request already in Redux', () => {
      jest.clearAllMocks();
      renderScreen();

      // Should not call API since request is already in Redux
      expect(pruningRequestsApi.getPruningRequestById).not.toHaveBeenCalled();
    });
  });

  describe('Header Section', () => {
    it('should display reference code as title', () => {
      renderScreen();

      expect(screen.getByText('PR-2026-001')).toBeTruthy();
    });

    it('should display status badge', () => {
      renderScreen();

      // Component maps 'submitted' status to 'Menunggu' label
      expect(screen.getByText('Menunggu')).toBeTruthy();
    });
  });

  describe('Request Details', () => {
    it('should display all request information', () => {
      renderScreen();

      // Component displays address and expected date
      expect(screen.getByText('Jln Pemuda No. 123')).toBeTruthy();
      expect(screen.getByText('2026-05-01')).toBeTruthy();
    });

    it('should display expected date', () => {
      renderScreen();

      expect(screen.getByText('2026-05-01')).toBeTruthy();
    });

    it('should display plant count', () => {
      renderScreen();

      // Component displays "15 pohon" not just "15"
      expect(screen.getByText(/15.*pohon/)).toBeTruthy();
    });

    it('should display notes', () => {
      renderScreen();

      expect(screen.getByText('Pohon sudah tua')).toBeTruthy();
    });
  });

  describe('Photos Section', () => {
    it('should display photo gallery', () => {
      renderScreen();

      // Check that photos are rendered (at least one photo should be visible)
      const scrollView = screen.UNSAFE_queryAllByType(require('react-native').ScrollView);
      expect(scrollView.length).toBeGreaterThan(0);
    });

    it('should show correct number of photos', () => {
      renderScreen();

      const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
      expect(images.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Reviewed Request', () => {
    it('should display review information when reviewed', async () => {
      // Update store with reviewed request
      store = configureStore({
        reducer: {
          auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
          pruningRequests: pruningRequestsReducer,
        },
        preloadedState: {
          auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
          pruningRequests: {
            mine: [],
            adminList: [],
            byId: {
              'pr-001': mockReviewedRequest,
            },
            isLoading: false,
            error: null,
            submitStatus: 'idle',
            submitError: null,
            reviewingId: null,
            converting: {},
          },
        },
      });

      renderScreen();

      // Component maps 'approved' status to 'Disetujui' label
      expect(screen.getByText('Disetujui')).toBeTruthy();
      expect(screen.getByText('Admin')).toBeTruthy();
    });

    it('should display review notes', async () => {
      // Update store with reviewed request
      store = configureStore({
        reducer: {
          auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
          pruningRequests: pruningRequestsReducer,
        },
        preloadedState: {
          auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
          pruningRequests: {
            mine: [],
            adminList: [],
            byId: {
              'pr-001': mockReviewedRequest,
            },
            isLoading: false,
            error: null,
            submitStatus: 'idle',
            submitError: null,
            reviewingId: null,
            converting: {},
          },
        },
      });

      renderScreen();

      expect(screen.getByText('Lokasi sudah diverifikasi')).toBeTruthy();
    });
  });

  describe('Converted Request', () => {
    it('should display task information when converted', async () => {
      // Update store with converted request
      store = configureStore({
        reducer: {
          auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
          pruningRequests: pruningRequestsReducer,
        },
        preloadedState: {
          auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
          pruningRequests: {
            mine: [],
            adminList: [],
            byId: {
              'pr-001': mockConvertedRequest,
            },
            isLoading: false,
            error: null,
            submitStatus: 'idle',
            submitError: null,
            reviewingId: null,
            converting: {},
          },
        },
      });

      renderScreen();

      // Component maps 'assigned' status to 'Ditugaskan' label.
      expect(screen.getByText('Ditugaskan')).toBeTruthy();
      // Task name is only shown in the button action, verify task section exists
      expect(screen.getByText(/Tugas Terkait/i)).toBeTruthy();
    });

    it('should display converted task link', async () => {
      // Update store with converted request
      store = configureStore({
        reducer: {
          auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
          pruningRequests: pruningRequestsReducer,
        },
        preloadedState: {
          auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
          pruningRequests: {
            mine: [],
            adminList: [],
            byId: {
              'pr-001': mockConvertedRequest,
            },
            isLoading: false,
            error: null,
            submitStatus: 'idle',
            submitError: null,
            reviewingId: null,
            converting: {},
          },
        },
      });

      renderScreen();

      // Verify "Lihat Tugas" button exists for viewing converted task
      const viewTaskButton = screen.getByText(/Lihat Tugas/i);
      expect(viewTaskButton).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when request not found', async () => {
      // Mock API to reject immediately when nonexistent-id is requested
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockImplementation((id: string) => {
        if (id === 'nonexistent-id') {
          return Promise.reject(new Error('Request not found'));
        }
        // For other IDs, return the mock request
        return Promise.resolve({ error: null, data: mockPruningRequest });
      });

      // Create a store with no request initially
      const errorStore = configureStore({
        reducer: {
          auth: (state = { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null }) => state,
          pruningRequests: pruningRequestsReducer,
        },
        preloadedState: {
          auth: { user: { id: '1', role: 'admin_data', phone: '08123456789', name: 'Admin' }, assignedArea: null, isAuthenticated: true, isLoading: false, isRestoring: false, error: null },
          pruningRequests: {
            mine: [],
            adminList: [],
            byId: {},
            isLoading: false,
            error: null,
            submitStatus: 'idle',
            submitError: null,
            reviewingId: null,
            converting: {},
          },
        },
      });

      const useNavigationMock = require('@react-navigation/native').useNavigation as jest.Mock;
      useNavigationMock.mockReturnValue(mockNavigation);
      const useRouteMock = require('@react-navigation/native').useRoute as jest.Mock;
      useRouteMock.mockReturnValue({
        params: { requestId: 'nonexistent-id', adminMode: false },
      });

      render(
        <Provider store={errorStore}>
          <RequestDetailScreen
            navigation={mockNavigation as any}
            route={{ params: { requestId: 'nonexistent-id', adminMode: false } } as any}
          />
        </Provider>
      );

      // Wait for the thunk to complete and component to re-render
      // The thunk will be rejected, setting isLoading=false and error in the reducer
      // Then the component should show the "not found" message
      await waitFor(
        () => {
          expect(screen.getByText('Permohonan tidak ditemukan')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('User Actions', () => {
    it('should render request reference code', () => {
      renderScreen();

      expect(screen.getByText('PR-2026-001')).toBeTruthy();
    });
  });

  describe('Scrolling and Layout', () => {
    it('should render full request details in scrollable container', () => {
      renderScreen();

      const scrollViews = screen.UNSAFE_queryAllByType(require('react-native').ScrollView);
      expect(scrollViews.length).toBeGreaterThan(0);
    });
  });
});
