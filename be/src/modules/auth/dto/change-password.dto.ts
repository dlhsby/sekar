import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Phase 4 sub-phase 4-7 (M3a): payload for POST /auth/change-password.
 * Used both for the self-service voluntary change AND for the forced flow
 * after an admin reset (ADR-041).
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @MinLength(1)
  old_password: string;

  @ApiProperty({ description: 'New password (min 8 chars)', minLength: 8 })
  @IsString()
  @MinLength(8)
  new_password: string;
}
