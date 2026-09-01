import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduleScopeResolverService } from './schedule-scope-resolver.service';
import { Schedule } from '../entities/schedule.entity';
import { AssignmentScope, NO_SCOPE } from '../../../common/enums/assignment-scope.enum';

type Row = {
  district_id: string | null;
  region_id: string | null;
  location_id: string | null;
  sl_id: string | null;
};

describe('ScheduleScopeResolverService', () => {
  let service: ScheduleScopeResolverService;
  let rows: Row[];
  const andWhere = jest.fn();

  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: andWhere.mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    rows = [];
    qb.getRawMany.mockImplementation(async () => rows);
    andWhere.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleScopeResolverService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
      ],
    }).compile();
    service = module.get(ScheduleScopeResolverService);
  });

  it('returns NO_SCOPE for empty user/date input (no query)', async () => {
    expect(await service.resolveForUserOnDate('', '2026-07-21')).toEqual(NO_SCOPE);
    expect(await service.resolveForUserOnDate('u1', '')).toEqual(NO_SCOPE);
  });

  it('returns NO_SCOPE when there is no occurrence', async () => {
    rows = [];
    expect(await service.resolveForUserOnDate('u1', '2026-07-21')).toEqual(NO_SCOPE);
  });

  it('resolves a location occurrence to location scope with all ids', async () => {
    rows = [{ district_id: 'd1', region_id: 'r1', location_id: 'l1', sl_id: 's1' }];
    expect(await service.resolveForUserOnDate('u1', '2026-07-21')).toEqual({
      scope: AssignmentScope.LOCATION,
      district_id: 'd1',
      region_id: 'r1',
      location_id: 'l1',
    });
  });

  it('resolves a region occurrence (no location) to region scope', async () => {
    rows = [{ district_id: 'd1', region_id: 'r1', location_id: null, sl_id: null }];
    expect(await service.resolveForUserOnDate('u1', '2026-07-21')).toEqual({
      scope: AssignmentScope.REGION,
      district_id: 'd1',
      region_id: 'r1',
      location_id: null,
    });
  });

  it('resolves a district-only occurrence to district scope', async () => {
    rows = [{ district_id: 'd1', region_id: null, location_id: null, sl_id: null }];
    expect((await service.resolveForUserOnDate('u1', '2026-07-21')).scope).toBe(
      AssignmentScope.DISTRICT,
    );
  });

  it('resolves an occurrence with no ids to city scope', async () => {
    rows = [{ district_id: null, region_id: null, location_id: null, sl_id: null }];
    expect((await service.resolveForUserOnDate('u1', '2026-07-21')).scope).toBe(
      AssignmentScope.CITY,
    );
  });

  it('keeps the DEEPEST scope when a user has several occurrences that day', async () => {
    rows = [
      { district_id: 'd1', region_id: null, location_id: null, sl_id: null }, // district
      { district_id: 'd1', region_id: 'r1', location_id: 'l1', sl_id: 's1' }, // location — deeper
    ];
    expect((await service.resolveForUserOnDate('u1', '2026-07-21')).scope).toBe(
      AssignmentScope.LOCATION,
    );
  });

  it('narrows to a single shift definition when provided', async () => {
    await service.resolveForUserOnDate('u1', '2026-07-21', 'shift-def-1');
    const shiftFilter = andWhere.mock.calls.find(
      ([clause]) => typeof clause === 'string' && clause.includes('shift_definition_id'),
    );
    expect(shiftFilter).toBeDefined();
  });

  it('does not filter by shift when none is provided', async () => {
    await service.resolveForUserOnDate('u1', '2026-07-21');
    const shiftFilter = andWhere.mock.calls.find(
      ([clause]) => typeof clause === 'string' && clause.includes('shift_definition_id'),
    );
    expect(shiftFilter).toBeUndefined();
  });
});
