import { IsString, IsEnum, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
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
  /**
   * User's updated full name.
   *
   * @example 'Pekerja Satu Updated'
   */
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

  /**
   * User's new password.
   * Will be hashed before updating.
   *
   * @example 'newsecurepassword123'
   */
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

  /**
   * User's updated role.
   *
   * @example 'supervisor'
   */
  @ApiPropertyOptional({
    description: 'User role',
    example: 'supervisor',
    enum: UserRole,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: worker, supervisor, admin',
  })
  @IsOptional()
  role?: UserRole;

  /**
   * Whether the user account is active.
   * Inactive users cannot login.
   *
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
