import {
  AssignmentScope,
  ASSIGNMENT_SCOPE_RANK,
  NO_SCOPE,
  scopeFromIds,
  deeperScope,
} from './assignment-scope.enum';

describe('assignment-scope helpers', () => {
  describe('ASSIGNMENT_SCOPE_RANK', () => {
    it('orders deepest → shallowest (location > region > district > city > none)', () => {
      expect(ASSIGNMENT_SCOPE_RANK[AssignmentScope.LOCATION]).toBeGreaterThan(
        ASSIGNMENT_SCOPE_RANK[AssignmentScope.REGION],
      );
      expect(ASSIGNMENT_SCOPE_RANK[AssignmentScope.REGION]).toBeGreaterThan(
        ASSIGNMENT_SCOPE_RANK[AssignmentScope.DISTRICT],
      );
      expect(ASSIGNMENT_SCOPE_RANK[AssignmentScope.DISTRICT]).toBeGreaterThan(
        ASSIGNMENT_SCOPE_RANK[AssignmentScope.CITY],
      );
      expect(ASSIGNMENT_SCOPE_RANK[AssignmentScope.CITY]).toBeGreaterThan(
        ASSIGNMENT_SCOPE_RANK[AssignmentScope.NONE],
      );
    });
  });

  describe('scopeFromIds', () => {
    it('picks location when a location_id is present (deepest wins over region/district)', () => {
      expect(scopeFromIds({ district_id: 'd', region_id: 'r', location_id: 'l' })).toEqual({
        scope: AssignmentScope.LOCATION,
        district_id: 'd',
        region_id: 'r',
        location_id: 'l',
      });
    });

    it('picks region when only region+district ids are present', () => {
      expect(scopeFromIds({ district_id: 'd', region_id: 'r' })).toEqual({
        scope: AssignmentScope.REGION,
        district_id: 'd',
        region_id: 'r',
        location_id: null,
      });
    });

    it('picks district when only a district_id is present', () => {
      expect(scopeFromIds({ district_id: 'd' })).toEqual({
        scope: AssignmentScope.DISTRICT,
        district_id: 'd',
        region_id: null,
        location_id: null,
      });
    });

    it('is city when explicitly city-wide and no ids', () => {
      expect(scopeFromIds({ cityWide: true })).toEqual({
        scope: AssignmentScope.CITY,
        district_id: null,
        region_id: null,
        location_id: null,
      });
    });

    it('is none when nothing is provided', () => {
      expect(scopeFromIds({})).toEqual(NO_SCOPE);
    });
  });

  describe('deeperScope', () => {
    it('returns the higher-ranked binding', () => {
      const district = scopeFromIds({ district_id: 'd' });
      const location = scopeFromIds({ location_id: 'l' });
      expect(deeperScope(district, location)).toBe(location);
      expect(deeperScope(location, district)).toBe(location);
    });

    it('keeps the first argument on a tie', () => {
      const a = scopeFromIds({ district_id: 'a' });
      const b = scopeFromIds({ district_id: 'b' });
      expect(deeperScope(a, b)).toBe(a);
    });
  });
});
