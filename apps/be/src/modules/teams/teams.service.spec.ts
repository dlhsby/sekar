import { ConflictException, NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';

/**
 * Phase 4: TeamsService only manages team categories (crew-type catalog).
 * Concrete teams are managed via schedule_events, not here.
 */
describe('TeamsService', () => {
  let service: TeamsService;
  let typeRepo: any;

  beforeEach(() => {
    typeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      create: jest.fn((v) => v),
    };
    service = new TeamsService(typeRepo);
  });

  describe('listTypes', () => {
    it('returns only active types by default', async () => {
      typeRepo.find.mockResolvedValue([]);
      await service.listTypes();
      expect(typeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true } }),
      );
    });

    it('returns all types when includeInactive is set', async () => {
      typeRepo.find.mockResolvedValue([]);
      await service.listTypes(true);
      expect(typeRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('createType', () => {
    it('creates a team category', async () => {
      const dto = { name: 'Penyiraman' };
      typeRepo.save.mockResolvedValue({ id: 'tt-1', ...dto });
      typeRepo.create.mockReturnValue(dto);
      const result = await service.createType(dto as any);
      expect(result.id).toBe('tt-1');
      expect(typeRepo.save).toHaveBeenCalled();
    });

    it('maps a unique violation to a friendly conflict', async () => {
      typeRepo.save.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
      typeRepo.create.mockReturnValue({ name: 'Penyiraman' });
      await expect(service.createType({ name: 'Penyiraman' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('updateType', () => {
    it('throws NotFound for a missing type', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(service.updateType('nope', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates an existing type', async () => {
      const existing = {
        id: 'tt-1',
        name: 'Penyiraman',
        is_active: true,
      };
      typeRepo.findOne.mockResolvedValue(existing);
      typeRepo.save.mockResolvedValue({ ...existing, is_active: false });
      const result = await service.updateType('tt-1', { is_active: false } as any);
      expect(result.is_active).toBe(false);
    });
  });

  describe('updateType — conflicts', () => {
    it('maps a rename onto an existing name to a friendly conflict', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 'tt-1', name: 'Penyiraman' });
      typeRepo.save.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
      await expect(service.updateType('tt-1', { name: 'Perawatan' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('does not mutate the loaded entity', async () => {
      const existing = { id: 'tt-1', name: 'Penyiraman', is_active: true };
      typeRepo.findOne.mockResolvedValue(existing);
      typeRepo.save.mockImplementation(async (v: unknown) => v);
      await service.updateType('tt-1', { name: 'Penyapuan' } as any);
      expect(existing.name).toBe('Penyiraman');
    });
  });

  describe('removeType', () => {
    it('throws NotFound for a missing type', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(service.removeType('nope')).rejects.toBeInstanceOf(NotFoundException);
      expect(typeRepo.softRemove).not.toHaveBeenCalled();
    });

    it('soft-removes via softRemove so deleted_by is stamped', async () => {
      const existing = { id: 'tt-1', name: 'Penyiraman' };
      typeRepo.findOne.mockResolvedValue(existing);
      await service.removeType('tt-1');
      expect(typeRepo.softRemove).toHaveBeenCalledWith(existing);
    });
  });
});
