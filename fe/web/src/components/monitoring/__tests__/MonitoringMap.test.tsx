/**
 * Unit Tests: MonitoringMap Component
 * mapbox-gl requires a WebGL canvas and cannot run in jsdom, so the module
 * is mocked entirely.  Tests verify:
 *  - the map container div renders when a Mapbox token is configured
 *  - the no-token fallback UI renders when the token is absent / placeholder
 *  - the user count appears in the fallback
 *  - no errors are thrown when users or areas arrays change
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { LiveUser } from '@/lib/api/monitoring';

// ---------------------------------------------------------------------------
// Mock mapbox-gl before importing the component
// ---------------------------------------------------------------------------

const mockRemove = jest.fn();
const mockAddControl = jest.fn();
const mockOn = jest.fn();
const mockOnce = jest.fn();
const mockFlyTo = jest.fn();
const mockGetLayer = jest.fn().mockReturnValue(false);
const mockGetSource = jest.fn().mockReturnValue(false);
const mockRemoveLayer = jest.fn();
const mockRemoveSource = jest.fn();
const mockAddSource = jest.fn();
const mockAddLayer = jest.fn();

const mockMarkerRemove = jest.fn();
const mockMarkerSetLngLat = jest.fn().mockReturnThis();
const mockMarkerAddTo = jest.fn().mockReturnThis();
const mockMarkerGetElement = jest.fn();

const mockPopupRemove = jest.fn();
const mockPopupSetLngLat = jest.fn().mockReturnThis();
const mockPopupAddTo = jest.fn().mockReturnThis();
const mockPopupSetHTML = jest.fn().mockReturnThis();

jest.mock('mapbox-gl', () => {
  const MockMap = jest.fn().mockImplementation(() => ({
    remove: mockRemove,
    addControl: mockAddControl,
    on: mockOn,
    once: mockOnce,
    flyTo: mockFlyTo,
    getLayer: mockGetLayer,
    getSource: mockGetSource,
    removeLayer: mockRemoveLayer,
    removeSource: mockRemoveSource,
    addSource: mockAddSource,
    addLayer: mockAddLayer,
    setStyle: jest.fn(),
  }));

  const MockMarker = jest.fn().mockImplementation(() => ({
    remove: mockMarkerRemove,
    setLngLat: mockMarkerSetLngLat,
    addTo: mockMarkerAddTo,
    getElement: mockMarkerGetElement,
  }));

  const MockPopup = jest.fn().mockImplementation(() => ({
    remove: mockPopupRemove,
    setLngLat: mockPopupSetLngLat,
    addTo: mockPopupAddTo,
    setHTML: mockPopupSetHTML,
  }));

  const MockNavigationControl = jest.fn();
  const MockFullscreenControl = jest.fn();
  const MockAttributionControl = jest.fn();

  return {
    __esModule: true,
    default: {
      Map: MockMap,
      Marker: MockMarker,
      Popup: MockPopup,
      NavigationControl: MockNavigationControl,
      FullscreenControl: MockFullscreenControl,
      AttributionControl: MockAttributionControl,
      accessToken: '',
    },
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    NavigationControl: MockNavigationControl,
    FullscreenControl: MockFullscreenControl,
    AttributionControl: MockAttributionControl,
    accessToken: '',
  };
});

// ---------------------------------------------------------------------------
// Import component *after* mock is in place
// ---------------------------------------------------------------------------

import { MonitoringMap } from '../MonitoringMap';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_USER: LiveUser = {
  id: 'user-1',
  full_name: 'Budi Santoso',
  role: 'satgas',
  phone: null,
  status: 'active',
  area_id: 'area-1',
  area_name: 'Taman Bungkul',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon Selatan',
  latitude: -7.289659,
  longitude: 112.739208,
  accuracy: 5,
  battery_level: 80,
  last_update: new Date().toISOString(),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  clock_in_time: new Date().toISOString(),
  current_task_status: null,
  current_task_title: null,
};

const defaultProps = {
  users: [MOCK_USER],
  areas: [],
  selectedUserId: null,
  onUserSelect: jest.fn(),
};

describe('MonitoringMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('With a valid Mapbox token (default jest.setup.ts)', () => {
    // jest.setup.ts sets NEXT_PUBLIC_MAPBOX_TOKEN = 'test-mapbox-token'

    it('should render the map container div', () => {
      const { container } = render(<MonitoringMap {...defaultProps} />);
      // The outer wrapper div should be present
      const wrapper = container.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render the inner map canvas container', () => {
      const { container } = render(<MonitoringMap {...defaultProps} />);
      const inner = container.querySelector('.absolute.inset-0');
      expect(inner).toBeInTheDocument();
    });

    it('should not render the no-token fallback', () => {
      render(<MonitoringMap {...defaultProps} />);
      expect(screen.queryByText(/token mapbox belum dikonfigurasi/i)).not.toBeInTheDocument();
    });

    it('should accept a custom className prop', () => {
      const { container } = render(
        <MonitoringMap {...defaultProps} className="custom-map-class" />
      );
      expect(container.querySelector('.custom-map-class')).toBeInTheDocument();
    });

    it('should render without errors when users array is empty', () => {
      expect(() => render(<MonitoringMap {...defaultProps} users={[]} />)).not.toThrow();
    });

    it('should render without errors when areas prop is omitted', () => {
      const { areas: _areas, ...propsWithoutAreas } = defaultProps;
      expect(() => render(<MonitoringMap {...propsWithoutAreas} />)).not.toThrow();
    });

    it('should render without errors when users have zero coordinates', () => {
      const userWithZeroCoords = { ...MOCK_USER, latitude: 0, longitude: 0 };
      expect(() =>
        render(<MonitoringMap {...defaultProps} users={[userWithZeroCoords]} />)
      ).not.toThrow();
    });
  });

  describe('Without a valid Mapbox token', () => {
    const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'your-mapbox-token-here';
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
    });

    it('should render the no-token fallback heading', () => {
      render(<MonitoringMap {...defaultProps} />);
      expect(screen.getByText(/token mapbox belum dikonfigurasi/i)).toBeInTheDocument();
    });

    it('should render the instruction to add env var', () => {
      render(<MonitoringMap {...defaultProps} />);
      expect(screen.getByText(/NEXT_PUBLIC_MAPBOX_TOKEN/)).toBeInTheDocument();
    });

    it('should display the number of detected users in the fallback', () => {
      render(<MonitoringMap {...defaultProps} users={[MOCK_USER]} />);
      expect(screen.getByText(/1 petugas terdeteksi/i)).toBeInTheDocument();
    });

    it('should display zero users in the fallback when users is empty', () => {
      render(<MonitoringMap {...defaultProps} users={[]} />);
      expect(screen.getByText(/0 petugas terdeteksi/i)).toBeInTheDocument();
    });

    it('should not render the map container div', () => {
      const { container } = render(<MonitoringMap {...defaultProps} />);
      expect(container.querySelector('.absolute.inset-0')).not.toBeInTheDocument();
    });
  });

  describe('Without any Mapbox token set', () => {
    const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
    });

    it('should render the no-token fallback when token env var is missing', () => {
      render(<MonitoringMap {...defaultProps} />);
      expect(screen.getByText(/token mapbox belum dikonfigurasi/i)).toBeInTheDocument();
    });
  });
});
