import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let teamRepo: any;
  let typeRepo: any;

  beforeEach(() => {
    const nameQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getExists: jest.fn().mockResolvedValue(false),
    };
    teamRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 't-new', ...v })),
      softRemove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => nameQb),
      _nameQb: nameQb,
    };
    typeRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn((v) => v) };
    service = new TeamsService(teamRepo, typeRepo);
  });

  describe('create', () => {
    it('rejects an unknown team type', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ name: 'Tim', team_type_id: 'nope' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates when the type exists', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 'tt1' });
      teamRepo.findOne.mockResolvedValue({ id: 't-new', name: 'Tim', team_type_id: 'tt1' });
      const team = await service.create({ name: 'Tim', team_type_id: 'tt1' } as any);
      expect(team.id).toBe('t-new');
      expect(teamRepo.save).toHaveBeenCalled();
    });

    it('rejects a duplicate team name (case-insensitive)', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 'tt1' });
      teamRepo._nameQb.getExists.mockResolvedValue(true);
      await expect(
        service.create({ name: 'Tim', team_type_id: 'tt1' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('rejects renaming to an existing team name', async () => {
      teamRepo.findOne.mockResolvedValue({ id: 't1', name: 'Tim A', team_type_id: 'tt1' });
      teamRepo._nameQb.getExists.mockResolvedValue(true);
      await expect(service.update('t1', { name: 'Tim B' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
      // Uniqueness check excludes the team itself.
      expect(teamRepo._nameQb.andWhere).toHaveBeenCalledWith('team.id != :excludeId', {
        excludeId: 't1',
      });
    });
  });

  describe('listTypes', () => {
    it('returns only active types by default', async () => {
      await service.listTypes();
      expect(typeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true } }),
      );
    });

    it('returns all types when includeInactive is set', async () => {
      await service.listTypes(true);
      expect(typeRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('createType', () => {
    it('maps a unique violation to a friendly conflict', async () => {
      typeRepo.save.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
      await expect(service.createType({ name: 'perawatan' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFound for a missing team', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('soft-removes an existing team', async () => {
      teamRepo.findOne.mockResolvedValue({ id: 't1', name: 'Tim' });
      await service.remove('t1');
      expect(teamRepo.softRemove).toHaveBeenCalled();
    });
  });
});
