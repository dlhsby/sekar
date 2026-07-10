import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let teamRepo: any;
  let typeRepo: any;

  beforeEach(() => {
    teamRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 't-new', ...v })),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    typeRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
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
