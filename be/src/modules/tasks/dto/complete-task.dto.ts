import { IsString, IsOptional, IsNumber, IsNotEmpty, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for completing a task with evidence
 */
export class CompleteTaskDto {
  @ApiPropertyOptional({
    description: 'URL of the completion photo (uploaded separately)',
    example: 'https://s3.amazonaws.com/sekar-media/tasks/completion-photo-123.jpg',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  completion_photo_url?: string;

  @ApiPropertyOptional({
    description: 'Notes about the task completion',
    example: 'Penyiraman selesai dilakukan, semua tanaman sudah disiram dengan baik',
  })
  @IsString()
  @IsOptional()
  completion_notes?: string;

  @ApiProperty({
    description: 'GPS latitude of completion location',
    example: -7.2756,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude of completion location',
    example: 112.7426,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  gps_lng: number;
}
