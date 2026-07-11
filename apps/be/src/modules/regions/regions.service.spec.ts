import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RegionsService } from './regions.service';

describe('RegionsService', () => {
  let service: RegionsService;
  let regionRepo: any;
  let rayonRepo: any;
  let areaRepo: any;

  beforeEach(() => {
    regionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'r-new', ...v })),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    rayonRepo = { findOne: jest.fn().mockResolvedValue({ id: 'rayon-1' }) };
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    areaRepo = {
      find: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => qb),
      _qb: qb,
    };
    service = new RegionsService(regionRepo, rayonRepo, areaRepo);
  });

  describe('create', () => {
    it('rejects a non-existent parent rayon', async () => {
      rayonRepo.findOne.mockResolvedValue(null);
      await expect(service.create({ name: 'K', rayon_id: 'nope' } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('detaches child areas (explicit SET NULL) then soft-removes', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', rayon_id: 'rayon-1' });
      await service.remove('reg-1');
      // Explicit SET NULL via query builder — repo.update() would skip undefined.
      expect(areaRepo._qb.set).toHaveBeenCalled();
      expect(areaRepo._qb.where).toHaveBeenCalledWith('region_id = :id', { id: 'reg-1' });
      expect(areaRepo._qb.execute).toHaveBeenCalled();
      expect(regionRepo.softRemove).toHaveBeenCalled();
    });

    it('throws NotFound for a missing region', async () => {
      regionRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assignAreas', () => {
    it('rejects areas from a different rayon', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', rayon_id: 'rayon-1' });
      areaRepo.find.mockResolvedValue([{ id: 'a1', name: 'Area 1', rayon_id: 'rayon-2' }]);
      await expect(service.assignAreas('reg-1', ['a1'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('re-parents same-rayon areas', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', rayon_id: 'rayon-1' });
      areaRepo.find.mockResolvedValue([{ id: 'a1', name: 'Area 1', rayon_id: 'rayon-1' }]);
      const res = await service.assignAreas('reg-1', ['a1']);
      expect(res).toEqual({ updated: 1 });
      // Un-parents non-selected areas of this region, then parents the selected set.
      expect(areaRepo._qb.andWhere).toHaveBeenCalledWith('id NOT IN (:...areaIds)', {
        areaIds: ['a1'],
      });
      expect(areaRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { region_id: 'reg-1' },
      );
    });

    it('clears all areas when the selection is empty', async () => {
      regionRepo.findOne.mockResolvedValue({ id: 'reg-1', rayon_id: 'rayon-1' });
      const res = await service.assignAreas('reg-1', []);
      expect(res).toEqual({ updated: 0 });
      // Un-parents every area of the region; no positive assignment.
      expect(areaRepo._qb.where).toHaveBeenCalledWith('region_id = :id', { id: 'reg-1' });
      expect(areaRepo._qb.andWhere).not.toHaveBeenCalled();
      expect(areaRepo.update).not.toHaveBeenCalled();
    });
  });
});
