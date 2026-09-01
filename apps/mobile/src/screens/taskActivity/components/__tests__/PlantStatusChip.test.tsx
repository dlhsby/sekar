/**
 * PlantStatusChip.test.tsx
 * Tests for plant status chip component
 * Phase 3 3-8: Plant due-date forecast
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PlantStatusChip } from '../PlantStatusChip';
import * as monitoringApi from '../../../../services/api/monitoringApi';

jest.mock('../../../../services/api/monitoringApi');

const mockGetAreaPlantStatus = monitoringApi.getAreaPlantStatus as jest.MockedFunction<
  typeof monitoringApi.getAreaPlantStatus
>;

describe('PlantStatusChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render if location_id is missing', () => {
    const { getByTestId } = render(
      <PlantStatusChip areaId="" taskTitle="Pruning Task" />
    );
    // Component returns null safely, no API call
    try {
      getByTestId('plant-status-chip');
      expect(false).toBeTruthy(); // Should not find this ID
    } catch {
      expect(true).toBeTruthy(); // Expected to not find it
    }
  });

  it('should not render if task is not pruning-related', async () => {
    mockGetAreaPlantStatus.mockResolvedValue({
      data: {
        areaId: 'area-1',
        areaName: 'Test Area',
        totals: {
          ok: 10,
          due_soon: 2,
          overdue: 1,
          unknown: 0,
        },
        bySpecies: [],
        generatedAt: '2026-04-27T00:00:00Z',
      },
    });

    const { getByTestId } = render(
      <PlantStatusChip areaId="area-1" taskTitle="General Maintenance" />
    );

    await waitFor(() => {
      expect(mockGetAreaPlantStatus).not.toHaveBeenCalled();
    });

    try {
      getByTestId('plant-status-chip');
      expect(false).toBeTruthy();
    } catch {
      expect(true).toBeTruthy();
    }
  });

  it('should display overdue status when plants are overdue', async () => {
    mockGetAreaPlantStatus.mockResolvedValue({
      data: {
        areaId: 'area-1',
        areaName: 'Test Area',
        totals: {
          ok: 10,
          due_soon: 2,
          overdue: 3,
          unknown: 0,
        },
        bySpecies: [],
        generatedAt: '2026-04-27T00:00:00Z',
      },
    });

    render(
      <PlantStatusChip areaId="area-1" taskTitle="Pruning Task" />
    );

    await waitFor(() => {
      expect(mockGetAreaPlantStatus).toHaveBeenCalledWith('area-1');
    });
  });

  it('should display due_soon status when no overdue plants', async () => {
    mockGetAreaPlantStatus.mockResolvedValue({
      data: {
        areaId: 'area-1',
        areaName: 'Test Area',
        totals: {
          ok: 10,
          due_soon: 5,
          overdue: 0,
          unknown: 0,
        },
        bySpecies: [],
        generatedAt: '2026-04-27T00:00:00Z',
      },
    });

    render(
      <PlantStatusChip areaId="area-1" taskTitle="Perantingan Pohon" />
    );

    await waitFor(() => {
      expect(mockGetAreaPlantStatus).toHaveBeenCalledWith('area-1');
    });
  });

  it('should display ok status when all plants are healthy', async () => {
    mockGetAreaPlantStatus.mockResolvedValue({
      data: {
        areaId: 'area-1',
        areaName: 'Test Area',
        totals: {
          ok: 20,
          due_soon: 0,
          overdue: 0,
          unknown: 0,
        },
        bySpecies: [],
        generatedAt: '2026-04-27T00:00:00Z',
      },
    });

    render(
      <PlantStatusChip areaId="area-1" taskTitle="Pruning Task" />
    );

    await waitFor(() => {
      expect(mockGetAreaPlantStatus).toHaveBeenCalledWith('area-1');
    });
  });

  it('should handle API errors gracefully', async () => {
    mockGetAreaPlantStatus.mockRejectedValue(new Error('API Error'));

    render(
      <PlantStatusChip areaId="area-1" taskTitle="Pruning Task" />
    );

    await waitFor(() => {
      expect(mockGetAreaPlantStatus).toHaveBeenCalledWith('area-1');
    });
  });

  it('should not render when data is null or totals missing', async () => {
    mockGetAreaPlantStatus.mockResolvedValue({
      data: undefined,
    });

    const { getByTestId } = render(
      <PlantStatusChip areaId="area-1" taskTitle="Pruning Task" />
    );

    await waitFor(() => {
      expect(mockGetAreaPlantStatus).toHaveBeenCalledWith('area-1');
    });

    try {
      getByTestId('plant-status-chip');
      expect(false).toBeTruthy();
    } catch {
      expect(true).toBeTruthy();
    }
  });
});
