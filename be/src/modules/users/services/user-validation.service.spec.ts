import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { UserValidationService } from './user-validation.service';
import { User } from '../entities/user.entity';

describe('UserValidationService', () => {
  let service: UserValidationService;
  let userRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    userRepository = { findOne: jest.fn() };

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
