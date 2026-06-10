import { IsString, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationConstants } from '../../../common/constants/auth.constants';

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
    description: 'Indonesian phone number',
    example: '081234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+62|0)[0-9]{8,13}$/, { message: 'Invalid Indonesian phone number' })
  phone_number?: string;
}
