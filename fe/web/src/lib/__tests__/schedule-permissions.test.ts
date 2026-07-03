import { canEditTargetRole, isGlobalRosterEditor } from '../schedule-permissions';

describe('schedule-permissions (roster edit hierarchy — mirrors backend)', () => {
  describe('canEditTargetRole', () => {
    it('admin_system / superadmin / top_management may edit anyone (full parity)', () => {
      for (const admin of ['admin_system', 'superadmin', 'top_management'] as const) {
        for (const target of [
          'satgas',
          'linmas',
          'korlap',
          'admin_data',
          'kepala_rayon',
          'top_management',
        ] as const) {
          expect(canEditTargetRole(admin, target)).toBe(true);
        }
      }
    });

    it('kepala_rayon / admin_data edit korlap + satgas + linmas, not peers/up', () => {
      for (const mgr of ['kepala_rayon', 'admin_data'] as const) {
        expect(canEditTargetRole(mgr, 'korlap')).toBe(true);
        expect(canEditTargetRole(mgr, 'satgas')).toBe(true);
        expect(canEditTargetRole(mgr, 'linmas')).toBe(true);
        expect(canEditTargetRole(mgr, 'kepala_rayon')).toBe(false);
        expect(canEditTargetRole(mgr, 'admin_data')).toBe(false);
        expect(canEditTargetRole(mgr, 'top_management')).toBe(false);
      }
    });

    it('korlap edits only satgas / linmas', () => {
      expect(canEditTargetRole('korlap', 'satgas')).toBe(true);
      expect(canEditTargetRole('korlap', 'linmas')).toBe(true);
      expect(canEditTargetRole('korlap', 'korlap')).toBe(false);
      expect(canEditTargetRole('korlap', 'kepala_rayon')).toBe(false);
    });

    it('field workers cannot edit anyone', () => {
      for (const worker of ['satgas', 'linmas', 'staff_kecamatan'] as const) {
        expect(canEditTargetRole(worker, 'satgas')).toBe(false);
      }
    });
  });

  describe('isGlobalRosterEditor', () => {
    it('is true only for admin_system / superadmin / top_management', () => {
      expect(isGlobalRosterEditor('admin_system')).toBe(true);
      expect(isGlobalRosterEditor('superadmin')).toBe(true);
      expect(isGlobalRosterEditor('top_management')).toBe(true);
      expect(isGlobalRosterEditor('kepala_rayon')).toBe(false);
      expect(isGlobalRosterEditor('korlap')).toBe(false);
    });
  });
});
