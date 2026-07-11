import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Socket } from 'socket.io';
import { RoomJoinService } from './room-join.service';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { UserAreasService } from '../../modules/user-areas/user-areas.service';

describe('RoomJoinService', () => {
  let service: RoomJoinService;
  let userRepository: { findOne: jest.Mock };
  let userAreasService: { getPermanentAreaIds: jest.Mock };

  beforeEach(async () => {
    userRepository = { findOne: jest.fn().mockResolvedValue(null) };
    userAreasService = { getPermanentAreaIds: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomJoinService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: UserAreasService, useValue: userAreasService },
      ],
    }).compile();

    service = module.get<RoomJoinService>(RoomJoinService);
  });

  describe('getRoomsForUser', () => {
    it('should always include the personal room', async () => {
      const rooms = await service.getRoomsForUser('u1', UserRole.SATGAS);
      expect(rooms).toContain('user:u1');
    });

    it.each([UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.MANAGEMENT])(
      'should include the city room for %s',
      async (role) => {
        const rooms = await service.getRoomsForUser('u1', role);
        expect(rooms).toEqual(['user:u1', 'monitoring:city']);
        // City roles never need the scoped lookup
        expect(userRepository.findOne).not.toHaveBeenCalled();
      },
    );

    it('should not include city or scoped rooms for satgas', async () => {
      const rooms = await service.getRoomsForUser('u1', UserRole.SATGAS);
      expect(rooms).toEqual(['user:u1']);
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it.each([UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON])(
      'should include the rayon room for %s',
      async (role) => {
        userRepository.findOne.mockResolvedValue({ id: 'u1', rayon_id: 'rayon-3', area_id: null });
        const rooms = await service.getRoomsForUser('u1', role);
        expect(rooms).toEqual(['user:u1', 'monitoring:rayon:rayon-3']);
      },
    );

    it('should include all assigned area rooms for korlap (multi-area)', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'k1', rayon_id: null, area_id: 'legacy' });
      userAreasService.getPermanentAreaIds.mockResolvedValue(['a1', 'a2']);

      const rooms = await service.getRoomsForUser('k1', UserRole.KORLAP);
      expect(rooms).toEqual(['user:k1', 'monitoring:area:a1', 'monitoring:area:a2']);
    });

    it('should fall back to the legacy single area for korlap without assignments', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'k1', rayon_id: null, area_id: 'area-5' });

      const rooms = await service.getRoomsForUser('k1', UserRole.KORLAP);
      expect(rooms).toEqual(['user:k1', 'monitoring:area:area-5']);
    });

    it('should return only the personal room when the user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const rooms = await service.getRoomsForUser('ghost', UserRole.KEPALA_RAYON);
      expect(rooms).toEqual(['user:ghost']);
    });

    it('should swallow lookup errors and return the base rooms', async () => {
      userRepository.findOne.mockRejectedValue(new Error('DB error'));
      const rooms = await service.getRoomsForUser('u1', UserRole.KEPALA_RAYON);
      expect(rooms).toEqual(['user:u1']);
    });
  });

  describe('joinRooms', () => {
    it('should join the socket to every room', () => {
      const client = { id: 'c1', join: jest.fn() } as unknown as Socket;
      service.joinRooms(client, ['user:u1', 'monitoring:city']);
      expect(client.join).toHaveBeenCalledWith('user:u1');
      expect(client.join).toHaveBeenCalledWith('monitoring:city');
      expect(client.join).toHaveBeenCalledTimes(2);
    });
  });
});
