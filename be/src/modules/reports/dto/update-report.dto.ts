import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating an existing report
 *
 * Workers can only update their own reports within 1 hour of creation.
 * Can update description and optionally replace photo.
 */
export class UpdateReportDto {
  @ApiProperty({
    description: 'Updated description of the report',
    example: 'Updated: Completed cleaning Taman Bungkul main area and side gardens.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  // Note: Photo replacement is handled via FileInterceptor in controller
}
