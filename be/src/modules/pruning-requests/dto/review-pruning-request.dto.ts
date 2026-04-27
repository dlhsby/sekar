import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for reviewing a pruning request (approve/reject).
 *
 * Used by admin_data, kepala_rayon, top_management, admin_system, or superadmin
 * to review and make decisions on submitted pruning requests.
 */
export class ReviewPruningRequestDto {
  /**
   * Review decision: approve or reject.
   *
   * @example 'approve'
   */
  @ApiProperty({
    description: 'Review decision',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsString()
  @IsNotEmpty({ message: 'Decision is required' })
  @IsIn(['approve', 'reject'], {
    message: 'Decision must be either approve or reject',
  })
  decision: 'approve' | 'reject';

  /**
   * Optional notes for the review (approval or rejection reason).
   *
   * @example 'Approved for processing next week'
   */
  @ApiPropertyOptional({
    description: 'Review notes (approval or rejection reason)',
    example: 'Approved for processing next week',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Review notes must be at most 1000 characters' })
  reviewNotes?: string;
}
