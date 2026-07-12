import {
  IsString,
  IsEnum,
  IsUUID,
  IsArray,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { ValidationConstants } from '../../../common/constants/auth.constants';
import { normalizePhone, INDO_MOBILE_REGEX } from '../../../common/utils/phone.util';

/**
 * Data Transfer Object for updating an existing user.
 *
 * All fields are optional. Only provided fields will be updated.
 * Password will be hashed before updating if provided.
 */
export class UpdateUserDto {
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
    description: 'Indonesian mobile for login. Normalized to 08xxxxxxxxxx (accepts +62/62 input).',
    example: '081234567890',
  })
  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? value : normalizePhone(value)))
  @IsString()
  @Matches(INDO_MOBILE_REGEX, { message: 'Phone number must be in the format 08xxxxxxxxxx' })
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'korlap',
    enum: UserRole,
  })
  @IsEnum(UserRole, {
    message:
      'Role must be one of: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin',
  })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Rayon ID (single). Optional for all roles.',
  })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiPropertyOptional({
    description: 'Permanent area assignments (multi). The first becomes the primary area.',
    type: [String],
  })
  @IsArray()
  // Location ids are deterministic UUID v5 — accept any version ('v4' rejects them).
  @IsUUID('all', { each: true })
  @IsOptional()
  location_ids?: string[];

  @ApiPropertyOptional({
    description: 'Single working shift for this worker.',
  })
  @IsUUID()
  @IsOptional()
  shift_definition_id?: string;

  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
