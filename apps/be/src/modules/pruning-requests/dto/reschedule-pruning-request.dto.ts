import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for rescheduling the expected date of a pruning request.
 *
 * Round 4 (Apr 28): admin_data (rayon-scoped), kepala_rayon, top_management,
 * admin_system, and superadmin can adjust `expected_date` independent of the
 * assign-to-task flow.
 */
export class ReschedulePruningRequestDto {
  @ApiProperty({
    description: 'New expected date for the pruning work (today or future)',
    example: '2026-05-12',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'expectedDate is required' })
  expectedDate: string;
}
