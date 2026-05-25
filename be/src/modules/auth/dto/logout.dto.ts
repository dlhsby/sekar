import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Phase 4-7 (M2): logout now requires the refresh token in the body so the
 * server can blacklist both the access (header) and refresh (body) tokens.
 * Breaking change vs. pre-Phase-4 (no body required).
 */
export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token issued to this session — blacklisted alongside the access token.',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
