/**
 * AssignedAreaCard Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AssignedAreaCard } from '../AssignedAreaCard';

// Mock NBCard component
jest.mock('../../nb', () => ({
  NBCard: ({ children, testID, style }: any) => {
    const { View } = require('react-native');
    return <View testID={testID} style={style}>{children}</View>;
  },
}));

describe('AssignedAreaCard', () => {
  const mockArea = {
    name: 'Taman Bungkul',
    area_type: {
      name: 'Taman Kota',
    },
    radius_meters: 100,
    address: 'Jl. Raya Darmo, Gubeng, Surabaya',
  };

  describe('Rendering', () => {
    it('should render card title', () => {
      const { getByText } = render(
        <AssignedAreaCard area={mockArea} />
      );

      expect(getByText('Area Ditugaskan')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <AssignedAreaCard area={mockArea} testID="custom-area-card" />
      );

      expect(getByTestId('custom-area-card')).toBeTruthy();
    });

    it('should render with default testID', () => {
      const { getByTestId } = render(
        <AssignedAreaCard area={mockArea} />
      );

      expect(getByTestId('assigned-area-card')).toBeTruthy();
    });
  });

  describe('Area Information Display', () => {
    it('should display area name', () => {
      const { getByText } = render(
        <AssignedAreaCard area={mockArea} />
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display area type and radius', () => {
      const { getByText } = render(
        <AssignedAreaCard area={mockArea} />
      );

      expect(getByText('Taman Kota - 100m radius')).toBeTruthy();
    });

    it('should display address when available', () => {
      const { getByText } = render(
        <AssignedAreaCard area={mockArea} />
      );

      expect(getByText('Jl. Raya Darmo, Gubeng, Surabaya')).toBeTruthy();
    });

    it('should not display address when not available', () => {
      const areaWithoutAddress = {
        ...mockArea,
        address: undefined,
      };

      const { queryByText } = render(
        <AssignedAreaCard area={areaWithoutAddress} />
      );

      expect(queryByText('Jl. Raya Darmo, Gubeng, Surabaya')).toBeNull();
    });

    it('should handle area without area_type', () => {
      const areaWithoutType = {
        name: 'Taman Test',
        area_type: undefined,
        radius_meters: 50,
        address: 'Test Address',
      };

      const { getByText } = render(
        <AssignedAreaCard area={areaWithoutType} />
      );

      expect(getByText('Taman Test')).toBeTruthy();
      expect(getByText(/50m radius/)).toBeTruthy();
    });

    it('should display area with missing area_type name', () => {
      const areaWithEmptyTypeName = {
        name: 'Taman Test',
        area_type: { name: undefined },
        radius_meters: 75,
      };

      const { getByText } = render(
        <AssignedAreaCard area={areaWithEmptyTypeName} />
      );

      expect(getByText(/75m radius/)).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should display empty message when area is null', () => {
      const { getByText } = render(
        <AssignedAreaCard area={null} />
      );

      expect(getByText('Tidak ada area ditugaskan')).toBeTruthy();
    });

    it('should not display area info when null', () => {
      const { queryByText } = render(
        <AssignedAreaCard area={null} />
      );

      expect(queryByText('Taman Bungkul')).toBeNull();
      expect(queryByText(/radius/)).toBeNull();
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long address to 2 lines', () => {
      const areaWithLongAddress = {
        ...mockArea,
        address: 'Jl. Raya Darmo No. 123, Kelurahan Gubeng, Kecamatan Gubeng, Kota Surabaya, Jawa Timur 60281, Indonesia',
      };

      const { getByText } = render(
        <AssignedAreaCard area={areaWithLongAddress} />
      );

      const addressElement = getByText(/Jl. Raya Darmo/);
      expect(addressElement.props.numberOfLines).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle area with radius_meters as 0', () => {
      const areaWithZeroRadius = {
        ...mockArea,
        radius_meters: 0,
      };

      const { getByText } = render(
        <AssignedAreaCard area={areaWithZeroRadius} />
      );

      expect(getByText('Taman Kota - 0m radius')).toBeTruthy();
    });

    it('should handle area with very large radius', () => {
      const areaWithLargeRadius = {
        ...mockArea,
        radius_meters: 9999,
      };

      const { getByText } = render(
        <AssignedAreaCard area={areaWithLargeRadius} />
      );

      expect(getByText('Taman Kota - 9999m radius')).toBeTruthy();
    });

    it('should handle area with undefined radius_meters', () => {
      const areaWithoutRadius = {
        name: 'Taman Test',
        area_type: { name: 'Taman' },
        radius_meters: undefined,
      };

      const { getByText } = render(
        <AssignedAreaCard area={areaWithoutRadius} />
      );

      expect(getByText(/Taman -/)).toBeTruthy();
    });

    it('should handle area with only name', () => {
      const minimalArea = {
        name: 'Minimal Taman',
      };

      const { getByText } = render(
        <AssignedAreaCard area={minimalArea} />
      );

      expect(getByText('Minimal Taman')).toBeTruthy();
    });

    it('should handle area without name', () => {
      const areaWithoutName = {
        name: undefined,
        area_type: { name: 'Taman Kota' },
        radius_meters: 100,
      };

      const { queryByText, getByText } = render(
        <AssignedAreaCard area={areaWithoutName} />
      );

      expect(getByText('Area Ditugaskan')).toBeTruthy();
    });
  });

  describe('Styling and Layout', () => {
    it('should render NBCard with elevated variant', () => {
      const { getByTestId } = render(
        <AssignedAreaCard area={mockArea} />
      );

      const card = getByTestId('assigned-area-card');
      expect(card).toBeTruthy();
    });
  });
});
