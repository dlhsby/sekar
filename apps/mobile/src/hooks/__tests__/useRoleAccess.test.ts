/**
 * useRoleAccess Hook Tests
 * Phase 2C: 8-role system permission checks (ADR-009)
 */

import { renderHook } from '@testing-library/react-native';
import { useRoleAccess } from '../useRoleAccess';
import type { UserRole } from '../../types/models.types';

// Mock the store hooks
const mockUseAppSelector = jest.fn();
jest.mock('../../store/hooks', () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

// Mock the roles constants
jest.mock('../../constants/roles', () => ({
  isClockableRole: jest.fn((role: string) =>
    ['satgas', 'linmas', 'korlap', 'admin_rayon', 'kepala_rayon'].includes(role),
  ),
  canSubmitActivities: jest.fn((role: string) =>
    ['satgas', 'linmas', 'korlap', 'admin_rayon', 'kepala_rayon'].includes(role),
  ),
  canCreateTasks: jest.fn((role: string) =>
    ['korlap', 'kepala_rayon', 'management', 'admin_system', 'superadmin'].includes(role),
  ),
  canReceiveTasks: jest.fn((role: string) =>
    ['satgas', 'linmas', 'korlap', 'kepala_rayon'].includes(role),
  ),
  canSubmitOvertime: jest.fn((role: string) =>
    ['satgas', 'linmas', 'korlap', 'admin_rayon', 'kepala_rayon'].includes(role),
  ),
  canApproveOvertime: jest.fn((role: string) =>
    ['korlap', 'kepala_rayon', 'management'].includes(role),
  ),
  canMonitor: jest.fn((role: string) =>
    ['korlap', 'admin_rayon', 'kepala_rayon', 'management', 'admin_system', 'superadmin'].includes(role),
  ),
  getMonitoringScope: jest.fn((role: string) => {
    if (['management', 'admin_system', 'superadmin'].includes(role)) return 'city';
    if (['kepala_rayon', 'admin_rayon'].includes(role)) return 'rayon';
    if (role === 'korlap') return 'area';
    return null;
  }),
}));

function setupRole(role: UserRole | undefined) {
  mockUseAppSelector.mockImplementation((selector: any) =>
    selector({ auth: { user: role ? { role } : null } }),
  );
}

describe('useRoleAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('satgas role', () => {
    it('should have correct permissions', () => {
      setupRole('satgas');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(true);
      expect(result.current.canSubmitActivity).toBe(true);
      expect(result.current.canCreateTask).toBe(false);
      expect(result.current.canReceiveTask).toBe(true);
      expect(result.current.canSubmitOvertime).toBe(true);
      expect(result.current.canApproveOvertime).toBe(false);
      expect(result.current.canMonitor).toBe(false);
      expect(result.current.monitoringScope).toBeNull();
      expect(result.current.role).toBe('satgas');
    });
  });

  describe('linmas role', () => {
    it('should have correct permissions', () => {
      setupRole('linmas');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(true);
      expect(result.current.canSubmitActivity).toBe(true);
      expect(result.current.canCreateTask).toBe(false);
      expect(result.current.canReceiveTask).toBe(true);
      expect(result.current.canSubmitOvertime).toBe(true);
      expect(result.current.canApproveOvertime).toBe(false);
      expect(result.current.canMonitor).toBe(false);
    });
  });

  describe('korlap role', () => {
    it('should have correct permissions', () => {
      setupRole('korlap');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(true);
      expect(result.current.canSubmitActivity).toBe(true);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.canReceiveTask).toBe(true);
      expect(result.current.canSubmitOvertime).toBe(true);
      expect(result.current.canApproveOvertime).toBe(true);
      expect(result.current.canMonitor).toBe(true);
      expect(result.current.monitoringScope).toBe('area');
    });
  });

  describe('admin_rayon role', () => {
    it('should have correct permissions', () => {
      setupRole('admin_rayon');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(true);
      expect(result.current.canSubmitActivity).toBe(true);
      expect(result.current.canCreateTask).toBe(false);
      expect(result.current.canReceiveTask).toBe(false);
      expect(result.current.canSubmitOvertime).toBe(true);
      expect(result.current.canApproveOvertime).toBe(false);
      expect(result.current.canMonitor).toBe(true);
      expect(result.current.monitoringScope).toBe('rayon');
    });
  });

  describe('kepala_rayon role', () => {
    it('should have correct permissions', () => {
      setupRole('kepala_rayon');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(true);
      expect(result.current.canSubmitActivity).toBe(true);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.canReceiveTask).toBe(true);
      expect(result.current.canSubmitOvertime).toBe(true);
      expect(result.current.canApproveOvertime).toBe(true);
      expect(result.current.canMonitor).toBe(true);
      expect(result.current.monitoringScope).toBe('rayon');
    });
  });

  describe('management role', () => {
    it('should have correct permissions', () => {
      setupRole('management');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(false);
      expect(result.current.canSubmitActivity).toBe(false);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.canReceiveTask).toBe(false);
      expect(result.current.canSubmitOvertime).toBe(false);
      expect(result.current.canApproveOvertime).toBe(true);
      expect(result.current.canMonitor).toBe(true);
      expect(result.current.monitoringScope).toBe('city');
    });
  });

  describe('admin_system role', () => {
    it('should have correct permissions', () => {
      setupRole('admin_system');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(false);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.canMonitor).toBe(true);
      expect(result.current.monitoringScope).toBe('city');
    });
  });

  describe('superadmin role', () => {
    it('should have correct permissions', () => {
      setupRole('superadmin');
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(false);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.canMonitor).toBe(true);
      expect(result.current.monitoringScope).toBe('city');
    });
  });

  describe('no user', () => {
    it('should return all false when no user', () => {
      setupRole(undefined);
      const { result } = renderHook(() => useRoleAccess());

      expect(result.current.canClock).toBe(false);
      expect(result.current.canSubmitActivity).toBe(false);
      expect(result.current.canCreateTask).toBe(false);
      expect(result.current.canReceiveTask).toBe(false);
      expect(result.current.canSubmitOvertime).toBe(false);
      expect(result.current.canApproveOvertime).toBe(false);
      expect(result.current.canMonitor).toBe(false);
      expect(result.current.monitoringScope).toBeNull();
      expect(result.current.role).toBeUndefined();
    });
  });
});
