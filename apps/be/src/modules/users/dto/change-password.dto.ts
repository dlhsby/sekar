import {
  IsString,
  IsNotEmpty,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidationConstants } from '../../../common/constants/auth.constants';

/**
 * Custom validator to ensure new password is different from current password
 */
@ValidatorConstraint({ name: 'isDifferentFromCurrent', async: false })
export class IsDifferentFromCurrentConstraint implements ValidatorConstraintInterface {
  validate(newPassword: string, args: ValidationArguments): boolean {
    const object = args.object as ChangePasswordDto;
    return newPassword !== object.current_password;
  }

  defaultMessage(): string {
    return 'New password must be different from current password';
  }
}

/**
 * Data Transfer Object for changing user password.
 *
 * Validates incoming request data for password change endpoint.
 * Ensures current password is provided and new password meets requirements.
 */
export class ChangePasswordDto {
  /**
   * User's current password for verification.
   * Must match the password stored in database.
   *
   * @example 'oldpass123'
   */
  @ApiProperty({
    description: 'Current password for verification',
    example: 'oldpass123',
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  current_password: string;

  /**
   * User's new password.
   * Must be at least 6 characters and different from current password.
   *
   * @example 'newpass456'
   */
  @ApiProperty({
    description: 'New password (min 6 characters, must be different from current)',
    example: 'newpass456',
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `New password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters`,
  })
  @Validate(IsDifferentFromCurrentConstraint)
  new_password: string;
}
