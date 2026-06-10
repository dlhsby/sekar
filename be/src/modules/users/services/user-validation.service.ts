import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * UserValidationService — uniqueness checks separated from UsersService CRUD
 * (Phase 4-7 H2). Centralizes the username and phone-number conflict rules
 * that were previously duplicated across create/update/updateOwnProfile.
 */
@Injectable()
export class UserValidationService {
  private readonly logger = new Logger(UserValidationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** @throws ConflictException when the username is already taken */
  async assertUsernameAvailable(username: string): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      this.logger.warn(`Username already exists - ${username}`);
      throw new ConflictException('Username already exists');
    }
  }

  /**
   * @param excludeUserId Skip the conflict when the phone belongs to this user
   *                      (update flows where the user keeps their own number)
   * @throws ConflictException when the phone number belongs to another user
   */
  async assertPhoneAvailable(phoneNumber: string, excludeUserId?: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { phone_number: phoneNumber },
    });
    if (existing && existing.id !== excludeUserId) {
      this.logger.warn(`Phone number already in use - ${phoneNumber}`);
      throw new ConflictException('Phone number already in use');
    }
  }
}
