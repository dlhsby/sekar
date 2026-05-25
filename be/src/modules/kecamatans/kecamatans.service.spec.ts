import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { KecamatansService } from './kecamatans.service';
import { Kecamatan } from './entities/kecamatan.entity';

describe('KecamatansService', () => {
  let service: KecamatansService;

  const mockKecamatan: Kecamatan = {
    id: 'kec-1',
    name: 'Wiyung',
    code: 'wiyung',
    rayon_id: 'rayon-1',
    region: 'selatan',
    rayon: { id: 'rayon-1', name: 'Rayon Selatan' } as any,
  } as Kecamatan;

  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const repo: Partial<jest.Mocked<Repository<Kecamatan>>> = {
    createQueryBuilder: jest.fn().mockReturnValue(qb) as any,
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [KecamatansService, { provide: getRepositoryToken(Kecamatan), useValue: repo }],
    }).compile();

    service = module.get<KecamatansService>(KecamatansService);
  });

  describe('findAll', () => {
    it('returns all kecamatans ordered by name when no rayonId given', async () => {
      qb.getMany.mockResolvedValue([mockKecamatan]);

      const result = await service.findAll();

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('k');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('k.rayon', 'rayon');
      expect(qb.orderBy).toHaveBeenCalledWith('k.name', 'ASC');
      expect(qb.where).not.toHaveBeenCalled();
      expect(result).toEqual([mockKecamatan]);
    });

    it('filters by rayon when rayonId is provided', async () => {
      qb.getMany.mockResolvedValue([mockKecamatan]);

      await service.findAll('rayon-1');

      expect(qb.where).toHaveBeenCalledWith('k.rayon_id = :rayonId', { rayonId: 'rayon-1' });
    });
  });

  describe('findOne', () => {
    it('returns the kecamatan when found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockKecamatan);

      const result = await service.findOne('kec-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'kec-1' },
        relations: ['rayon'],
      });
      expect(result).toBe(mockKecamatan);
    });

    it('throws NotFoundException when missing', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
