import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';
import { RegionsService } from './regions.service';

describe('RegionsService', () => {
  let service: RegionsService;
  let regionRepo: any;
  let districtRepo: any;
  let locationRepo: any;

  beforeEach(() => {
    regionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'r-new', ...v })),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    districtRepo = { findOne: jest.fn().mockResolvedValue({ id: 'district-1' }) };
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    locationRepo = {
      find: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => qb),
      _qb: qb,
    };
    service = new RegionsService(regionRepo, districtRepo, locationRepo);
  });

  describe('create', () => {
    it('rejects a non-existent parent district', async () => {
      districtRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ name: 'K', district_id: 'nope' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll scoping', () => {
    it('forces district-scoped callers onto their own district', async () => {
      await service.findAll(
        { role: 'kepala_rayon', district_id: 'district-mine' } as any,
        'district-other',
      );
      expect(regionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { district_id: 'district-mine', is_active: true } }),
      );
    });

    it('returns nothing for a district-scoped caller without a district', async () => {
      const result = await service.findAll({ role: 'korlap', district_id: null } as any);
      expect(result).toEqual([]);
      expect(regionRepo.find).not.toHaveBeenCalled();
    });

    it('lets city-scope callers filter any district', async () => {
      await service.findAll({ role: 'admin_system', district_id: null } as any, 'district-2');
      expect(regionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { district_id: 'district-2', is_active: true } }),
      );
    });

    it('hides deactivated kawasan by default, so pickers never offer one', async () => {
      await service.findAll({ role: 'admin_system', district_id: null } as any);
      expect(regionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true } }),
      );
    });

    it('includes deactivated kawasan for the admin management grid', async () => {
      await service.findAll({ role: 'admin_system', district_id: null } as any, undefined, true);
      expect(regionRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('update', () => {
    it('blocks moving a region to another district while it has assigned areas', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', district_id: 'district-1', name: 'K' });
      locationRepo.count.mockResolvedValue(3);
      await expect(
        service.update('reg-1', { district_id: 'district-2' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a structurally invalid boundary polygon', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', district_id: 'district-1', name: 'K' });
      await expect(
        service.update('reg-1', {
          boundary_polygon: { type: 'Polygon', coordinates: [[]] },
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('detaches child areas (explicit SET NULL) then soft-removes', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', district_id: 'district-1' });
      await service.remove('reg-1');
      // Explicit SET NULL via query builder — repo.update() would skip undefined.
      expect(locationRepo._qb.set).toHaveBeenCalled();
      expect(locationRepo._qb.where).toHaveBeenCalledWith('region_id = :id', { id: 'reg-1' });
      expect(locationRepo._qb.execute).toHaveBeenCalled();
      expect(regionRepo.softRemove).toHaveBeenCalled();
    });

    it('throws NotFound for a missing region', async () => {
      regionRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assignLocations', () => {
    it('rejects areas from a different district', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', district_id: 'district-1' });
      locationRepo.find.mockResolvedValue([
        { id: 'a1', name: 'Location 1', district_id: 'district-2' },
      ]);
      await expect(service.assignLocations('reg-1', ['a1'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('re-parents same-district areas', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', district_id: 'district-1' });
      locationRepo.find.mockResolvedValue([
        { id: 'a1', name: 'Location 1', district_id: 'district-1' },
      ]);
      const res = await service.assignLocations('reg-1', ['a1']);
      expect(res).toEqual({ updated: 1 });
      // Un-parents non-selected areas of this region, then parents the selected set.
      expect(locationRepo._qb.andWhere).toHaveBeenCalledWith('id NOT IN (:...locationIds)', {
        locationIds: ['a1'],
      });
      expect(locationRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { region_id: 'reg-1' },
      );
    });

    it('clears all areas when the selection is empty', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', district_id: 'district-1' });
      const res = await service.assignLocations('reg-1', []);
      expect(res).toEqual({ updated: 0 });
      // Un-parents every area of the region; no positive assignment.
      expect(locationRepo._qb.where).toHaveBeenCalledWith('region_id = :id', { id: 'reg-1' });
      expect(locationRepo._qb.andWhere).not.toHaveBeenCalled();
      expect(locationRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate / activate', () => {
    it('deactivates a kawasan with no active lokasi under it', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', is_active: true });
      locationRepo.count.mockResolvedValue(0);
      regionRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await service.deactivate('reg-1');

      expect(result.is_active).toBe(false);
    });

    it('refuses while active lokasi still reference it', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', is_active: true });
      locationRepo.count.mockResolvedValue(2);

      await expect(service.deactivate('reg-1')).rejects.toBeInstanceOf(ApiException);
      await expect(service.deactivate('reg-1')).rejects.toThrow(/2 active location/);
      expect(regionRepo.save).not.toHaveBeenCalled();
    });

    it('reactivates without any guard', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', is_active: false });
      regionRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await service.activate('reg-1');

      expect(result.is_active).toBe(true);
      expect(locationRepo.count).not.toHaveBeenCalled();
    });
  });
});
