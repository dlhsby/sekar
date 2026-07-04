import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * RejectActivityDto
 *
 * Payload for rejecting a pending activity.
 * The reviewer must provide a clear reason for the rejection.
 */
export class RejectActivityDto {
  @ApiProperty({
    description: 'Alasan penolakan aktivitas',
    example: 'Foto tidak jelas, harap upload ulang dengan pencahayaan yang cukup',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(1000)
  reason: string;
}
