import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * Bulk admin password reset request — the user ids (from a multi-select or a
 * "reset all in rayon" selection) to reset to fresh one-time temp passwords.
 * Capped to keep a single request bounded.
 */
export class BulkResetPasswordDto {
  @ApiProperty({
    type: [String],
    description: 'User UUIDs to reset (1–1000).',
    example: ['8127dc81-97cf-4c6e-a1b4-b1ace284ea78'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  // Most user ids are deterministic UUID v5 (sheet-imported roster), so accept any
  // version — 'v4' would reject the very workers this bulk reset needs to unblock.
  @IsUUID('all', { each: true })
  user_ids: string[];
}
