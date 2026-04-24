import {
  IsString,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { ValidationConstants } from '../../../common/constants/auth.constants';

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
    description: 'New password (will be hashed)',
    example: 'newsecurepassword123',
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @IsOptional()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters`,
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'Indonesian phone number for login',
    example: '081234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+62|0)[0-9]{8,13}$/, { message: 'Invalid Indonesian phone number' })
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
    description: 'Rayon ID (for kepala_rayon role)',
  })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiPropertyOptional({
    description: 'Area ID (for korlap role)',
  })
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
