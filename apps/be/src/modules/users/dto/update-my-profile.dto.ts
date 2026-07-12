import { IsString, MaxLength, IsOptional, Matches, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationConstants } from '../../../common/constants/auth.constants';
import { normalizePhone, INDO_MOBILE_REGEX } from '../../../common/utils/phone.util';

/**
 * Data Transfer Object for self-service profile updates.
 *
 * Allows authenticated users to update their own name, username, and phone.
 * Privilege fields (role, rayon_id, location_id, is_active, password) remain
 * forbidden and are stripped by the global ValidationPipe.
 */
export class UpdateMyProfileDto {
  @ApiPropertyOptional({
    description: "User's full name",
    example: 'Pekerja Satu Updated',
    maxLength: ValidationConstants.FULL_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsOptional()
  @MaxLength(ValidationConstants.FULL_NAME_MAX_LENGTH, {
    message: `Full name must not exceed ${ValidationConstants.FULL_NAME_MAX_LENGTH} characters`,
  })
  full_name?: string;

  @ApiPropertyOptional({
    description: 'Username for login (letters, numbers, underscores, hyphens).',
    example: 'satgas4',
  })
  @IsString()
  @IsOptional()
  @MaxLength(ValidationConstants.USERNAME_MAX_LENGTH, {
    message: `Username must not exceed ${ValidationConstants.USERNAME_MAX_LENGTH} characters`,
  })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Indonesian mobile. Normalized to 08xxxxxxxxxx (accepts +62/62 input).',
    example: '081234567890',
  })
  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? value : normalizePhone(value)))
  @IsString()
  @Matches(INDO_MOBILE_REGEX, { message: 'Phone number must be in the format 08xxxxxxxxxx' })
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'Preferred UI language for web + mobile clients.',
    enum: ['id', 'en'],
    example: 'id',
  })
  @IsOptional()
  @IsIn(['id', 'en'], { message: 'preferred_language must be one of: id, en' })
  preferred_language?: 'id' | 'en';
}
