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

  /** Non-throwing availability check (for the live username field). */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await this.userRepository.findOne({ where: { username } });
    return !existing;
  }

  /**
   * Suggest a unique username derived from a full name (slugified to the allowed
   * `[a-z0-9_-]` charset), appending a numeric suffix until it is free.
   */
  async suggestUsername(fullName: string): Promise<string> {
    const base = this.slugifyUsername(fullName) || 'user';
    if (await this.isUsernameAvailable(base)) return base;
    for (let n = 2; n < 1000; n += 1) {
      const candidate = `${base}${n}`;
      if (await this.isUsernameAvailable(candidate)) return candidate;
    }
    // Extremely unlikely fallback — keep it deterministic-ish without randomness.
    return `${base}${Date.now().toString().slice(-5)}`;
  }

  /** Lowercase ASCII slug with only letters/digits/underscore, max 30 chars. */
  private slugifyUsername(input: string): string {
    return (input ?? '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // non-alphanumerics → underscore
      .replace(/^_+|_+$/g, '') // trim underscores
      .slice(0, 30);
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
