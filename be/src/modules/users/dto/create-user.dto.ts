import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { ValidationConstants } from '../../../common/constants/auth.constants';

/**
 * Data Transfer Object for creating a new user.
 *
 * Validates incoming request data for user creation endpoint.
 * Username, password, and full_name are required.
 * Role defaults to 'worker' if not specified.
 */
export class CreateUserDto {
  /**
   * User's username for login.
   * Must be unique in the system.
   * Can only contain letters, numbers, underscores, and hyphens.
   *
   * @example 'worker4'
   */
  @ApiProperty({
    description:
      'Username for login (alphanumeric with underscores/hyphens allowed)',
    example: 'worker4',
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
  @ApiProperty({
    description: 'Password for authentication (min 6 characters)',
    example: 'securepassword123',
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters`,
  })
  password: string;

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
   * Defaults to 'worker' if not specified.
   *
   * @example 'worker'
   */
  @ApiPropertyOptional({
    description: 'User role (defaults to worker)',
    example: 'worker',
    enum: UserRole,
    default: UserRole.WORKER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: worker, supervisor, admin',
  })
  @IsOptional()
  role?: UserRole;
}
