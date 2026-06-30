import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { ValidationConstants } from '../../../common/constants/auth.constants';
import { normalizePhone, INDO_MOBILE_REGEX } from '../../../common/utils/phone.util';

/**
 * Data Transfer Object for creating a new user.
 *
 * Validates incoming request data for user creation endpoint.
 * Username, password, and full_name are required.
 * Role defaults to 'satgas' if not specified.
 */
export class CreateUserDto {
  /**
   * User's username for login.
   * Must be unique in the system.
   * Can only contain letters, numbers, underscores, and hyphens.
   *
   * @example 'satgas4'
   */
  @ApiProperty({
    description: 'Username for login (alphanumeric with underscores/hyphens allowed)',
    example: 'satgas4',
    minLength: 1,
    maxLength: ValidationConstants.USERNAME_MAX_LENGTH,
    pattern: '^[a-zA-Z0-9_-]+$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(ValidationConstants.USERNAME_MAX_LENGTH, {
    message: `Username must not exceed ${ValidationConstants.USERNAME_MAX_LENGTH} characters`,
  })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  /**
   * User's password for authentication.
   * Will be hashed before storing in database.
   *
   * @example 'securepassword123'
   */
  /**
   * Optional. When omitted (the normal flow), the backend auto-generates a
   * one-time temporary password and returns it once; the user is forced to
   * change it on first login. Admins do not set passwords directly.
   */
  @ApiPropertyOptional({
    description:
      'Optional. Omit to auto-generate a one-time temp password (returned once as `temp_password`).',
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @IsOptional()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters`,
  })
  password?: string;

  /**
   * User's full name for display.
   *
   * @example 'Pekerja Empat'
   */
  @ApiProperty({
    description: "User's full name",
    example: 'Pekerja Empat',
    minLength: 1,
    maxLength: ValidationConstants.FULL_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(ValidationConstants.FULL_NAME_MAX_LENGTH, {
    message: `Full name must not exceed ${ValidationConstants.FULL_NAME_MAX_LENGTH} characters`,
  })
  full_name: string;

  /**
   * User's role in the system.
   * Defaults to 'satgas' if not specified.
   *
   * @example 'satgas'
   */
  @ApiPropertyOptional({
    description: 'User role (defaults to satgas)',
    example: 'satgas',
    enum: UserRole,
    default: UserRole.SATGAS,
  })
  @IsEnum(UserRole, {
    message:
      'Role must be one of: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin',
  })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Indonesian mobile for login. Normalized to 08xxxxxxxxxx (accepts +62/62 input).',
    example: '081234567890',
  })
  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? value : normalizePhone(value)))
  @IsString()
  @Matches(INDO_MOBILE_REGEX, { message: 'Nomor HP harus dalam format 08xxxxxxxxxx' })
  phone_number?: string;

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
  @IsUUID('4', { each: true })
  @IsOptional()
  area_ids?: string[];

  @ApiPropertyOptional({
    description: 'Single working shift for this worker (one timeframe across all areas).',
  })
  @IsUUID()
  @IsOptional()
  shift_definition_id?: string;
}
