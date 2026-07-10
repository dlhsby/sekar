import {
  permissionMatches,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from './permission-matcher';

describe('permission-matcher', () => {
  describe('permissionMatches', () => {
    it('matches exact keys', () => {
      expect(permissionMatches('user:read', 'user:read')).toBe(true);
      expect(permissionMatches('user:read', 'user:create')).toBe(false);
      expect(permissionMatches('user:read', 'role:read')).toBe(false);
    });

    it('matches global wildcard *:*', () => {
      expect(permissionMatches('*:*', 'anything:goes')).toBe(true);
      expect(permissionMatches('*:*', 'settings:manage')).toBe(true);
    });

    it('matches resource wildcard resource:*', () => {
      expect(permissionMatches('user:*', 'user:read')).toBe(true);
      expect(permissionMatches('user:*', 'user:delete')).toBe(true);
      expect(permissionMatches('user:*', 'role:read')).toBe(false);
    });

    it('matches action wildcard *:action', () => {
      expect(permissionMatches('*:read', 'user:read')).toBe(true);
      expect(permissionMatches('*:read', 'role:read')).toBe(true);
      expect(permissionMatches('*:read', 'user:create')).toBe(false);
    });

    it('returns false for malformed keys', () => {
      expect(permissionMatches('nocolon', 'user:read')).toBe(false);
      expect(permissionMatches('user:read', 'nocolon')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('is true when any granted key matches', () => {
      expect(hasPermission(['role:read', 'user:*'], 'user:delete')).toBe(true);
      expect(hasPermission(['role:read'], 'user:delete')).toBe(false);
    });
  });

  describe('hasAllPermissions (AND)', () => {
    it('requires every key to be satisfied', () => {
      const granted = ['user:read', 'user:create'];
      expect(hasAllPermissions(granted, ['user:read', 'user:create'])).toBe(true);
      expect(hasAllPermissions(granted, ['user:read', 'user:delete'])).toBe(false);
    });

    it('is satisfied by *:* for any required set', () => {
      expect(hasAllPermissions(['*:*'], ['user:read', 'settings:manage'])).toBe(true);
    });
  });

  describe('hasAnyPermission (OR)', () => {
    it('is true when at least one key is satisfied', () => {
      expect(hasAnyPermission(['user:read'], ['user:read', 'settings:manage'])).toBe(true);
      expect(hasAnyPermission(['activity:create'], ['user:read', 'settings:manage'])).toBe(false);
    });
  });
});
