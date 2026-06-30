import { IsString, MaxLength, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationConstants } from '../../../common/constants/auth.constants';
import { normalizePhone, INDO_MOBILE_REGEX } from '../../../common/utils/phone.util';

/**
 * Data Transfer Object for self-service profile updates.
 *
 * Allows authenticated users to update only their name and phone number.
 * All privilege fields (role, rayon_id, area_id, is_active, password, username)
 * are forbidden and will be stripped by the global ValidationPipe.
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
    description: 'Indonesian mobile. Normalized to 08xxxxxxxxxx (accepts +62/62 input).',
    example: '081234567890',
  })
  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? value : normalizePhone(value)))
  @IsString()
  @Matches(INDO_MOBILE_REGEX, { message: 'Nomor HP harus dalam format 08xxxxxxxxxx' })
  phone_number?: string;
}
