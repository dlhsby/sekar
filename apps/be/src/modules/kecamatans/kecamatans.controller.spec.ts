import { Test, TestingModule } from '@nestjs/testing';
import { KecamatansController } from './kecamatans.controller';
import { KecamatansService } from './kecamatans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Kecamatan } from './entities/kecamatan.entity';

describe('KecamatansController', () => {
  let controller: KecamatansController;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockKecamatan: Kecamatan = {
    id: 'kec-1',
    name: 'Wiyung',
    code: 'wiyung',
    district_id: 'district-1',
    region: 'selatan',
    district: { id: 'district-1', name: 'Rayon Selatan' } as any,
  } as Kecamatan;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KecamatansController],
      providers: [{ provide: KecamatansService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KecamatansController>(KecamatansController);
  });

  describe('findAll', () => {
    it('maps service entities to response DTOs and includes district_name', async () => {
      service.findAll.mockResolvedValue([mockKecamatan]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([
        {
          id: 'kec-1',
          name: 'Wiyung',
          code: 'wiyung',
          district_id: 'district-1',
          district_name: 'Rayon Selatan',
          region: 'selatan',
        },
      ]);
    });

    it('forwards the districtId filter to the service', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll('district-1');

      expect(service.findAll).toHaveBeenCalledWith('district-1');
    });

    it('leaves district_name undefined when relation not eager-loaded', async () => {
      service.findAll.mockResolvedValue([{ ...mockKecamatan, district: undefined }]);

      const result = await controller.findAll();

      expect(result[0].district_name).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('returns the mapped DTO for the requested id', async () => {
      service.findOne.mockResolvedValue(mockKecamatan);

      const result = await controller.findOne('kec-1');

      expect(service.findOne).toHaveBeenCalledWith('kec-1');
      expect(result.id).toBe('kec-1');
      expect(result.district_name).toBe('Rayon Selatan');
    });

    it('propagates service errors', async () => {
      const err = new Error('boom');
      service.findOne.mockRejectedValue(err);

      await expect(controller.findOne('kec-1')).rejects.toBe(err);
    });
  });
});
