import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidationConstants } from '../../../common/constants/auth.constants';

/**
 * Data Transfer Object for user login.
 *
 * Validates incoming request data for authentication endpoint.
 * All fields are required.
 */
export class LoginDto {
  /**
   * User's username for authentication.
   * Must be alphanumeric with optional underscores and hyphens.
   *
   * @example 'worker1'
   */
  @ApiProperty({
    description: 'Username for authentication',
    example: 'worker1',
    minLength: 1,
    maxLength: ValidationConstants.USERNAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(ValidationConstants.USERNAME_MAX_LENGTH, {
    message: `Username must not exceed ${ValidationConstants.USERNAME_MAX_LENGTH} characters`,
  })
  username: string;

  /**
   * User's password for authentication.
   * Must be at least 6 characters long.
   *
   * @example 'worker123'
   */
  @ApiProperty({
    description: 'Password for authentication',
    example: 'worker123',
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters`,
  })
  password: string;
}
