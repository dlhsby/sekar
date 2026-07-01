import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { UserValidationService } from './user-validation.service';
import { User } from '../entities/user.entity';

describe('UserValidationService', () => {
  let service: UserValidationService;
  let userRepository: { findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let qbGetRawMany: jest.Mock;

  beforeEach(async () => {
    qbGetRawMany = jest.fn().mockResolvedValue([]);
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: qbGetRawMany,
    };
    userRepository = { findOne: jest.fn(), createQueryBuilder: jest.fn(() => qb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get<UserValidationService>(UserValidationService);
  });

  describe('assertUsernameAvailable', () => {
    it('should resolve when the username is unused', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.assertUsernameAvailable('newuser')).resolves.toBeUndefined();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { username: 'newuser' } });
    });

    it('should throw ConflictException when the username exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'u1', username: 'taken' });
      await expect(service.assertUsernameAvailable('taken')).rejects.toThrow(ConflictException);
      await expect(service.assertUsernameAvailable('taken')).rejects.toThrow(
        'Username already exists',
      );
    });
  });

  describe('isUsernameAvailable', () => {
    it('returns true when unused, false when taken', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      expect(await service.isUsernameAvailable('free')).toBe(true);
      userRepository.findOne.mockResolvedValueOnce({ id: 'u1' });
      expect(await service.isUsernameAvailable('taken')).toBe(false);
    });
  });

  describe('suggestUsername', () => {
    it('slugifies the full name (lowercase, diacritics stripped, spaces → _)', async () => {
      qbGetRawMany.mockResolvedValue([]); // nothing taken
      expect(await service.suggestUsername('Budi Santoso')).toBe('budi_santoso');
      expect(await service.suggestUsername('Áder  Rahmań')).toBe('ader_rahman');
    });

    it('appends a numeric suffix until a free username is found', async () => {
      // base + base2 taken (returned by the single prefix query), base3 free
      qbGetRawMany.mockResolvedValue([{ username: 'budi' }, { username: 'budi2' }]);
      expect(await service.suggestUsername('Budi')).toBe('budi3');
    });

    it('uses a single prefix query rather than one lookup per candidate', async () => {
      qbGetRawMany.mockResolvedValue([{ username: 'budi' }]);
      await service.suggestUsername('Budi');
      expect(userRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qbGetRawMany).toHaveBeenCalledTimes(1);
    });

    it('falls back to "user" when the name has no usable characters', async () => {
      qbGetRawMany.mockResolvedValue([]);
      expect(await service.suggestUsername('!!!')).toBe('user');
    });
  });

  describe('isPhoneAvailable', () => {
    it('returns true when the phone is unused', async () => {
      userRepository.findOne.mockResolvedValue(null);
      expect(await service.isPhoneAvailable('081200000001')).toBe(true);
    });

    it('returns false when another user owns the phone', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'other-user' });
      expect(await service.isPhoneAvailable('081200000001')).toBe(false);
    });

    it('returns true when the phone belongs to the excluded user (self-edit)', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'self' });
      expect(await service.isPhoneAvailable('081200000001', 'self')).toBe(true);
    });
  });

  describe('assertPhoneAvailable', () => {
    it('should resolve when the phone number is unused', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.assertPhoneAvailable('081200000001')).resolves.toBeUndefined();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { phone_number: '081200000001' },
      });
    });

    it('should throw ConflictException when another user owns the phone number', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'other-user' });
      await expect(service.assertPhoneAvailable('081200000001')).rejects.toThrow(ConflictException);
      await expect(service.assertPhoneAvailable('081200000001')).rejects.toThrow(
        'Phone number already in use',
      );
    });

    it('should resolve when the phone number belongs to the excluded user (self-update)', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'self' });
      await expect(service.assertPhoneAvailable('081200000001', 'self')).resolves.toBeUndefined();
    });

    it('should throw when the phone belongs to another user even with an exclude id', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'other-user' });
      await expect(service.assertPhoneAvailable('081200000001', 'self')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
