import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ValidationConstants } from '../../../common/constants/auth.constants';

/**
 * Phase 4 sub-phase 4-7 (M3a): payload for POST /auth/change-password.
 * Used both for the self-service voluntary change AND for the forced flow
 * after an admin reset (ADR-041).
 *
 * `old_password` is OPTIONAL: required for a voluntary change (proves the
 * current password), but omitted in the admin-forced flow — the caller is
 * already JWT-authenticated and `password_must_change` gates the screen, so
 * re-typing the temporary password is redundant.
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password (omit for the admin-forced reset flow)',
    required: false,
  })
  @IsOptional()
  @IsString()
  old_password?: string;

  @ApiProperty({
    description: `New password (min ${ValidationConstants.PASSWORD_MIN_LENGTH} chars)`,
    minLength: ValidationConstants.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH)
  new_password: string;
}
