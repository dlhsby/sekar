import { IsString, IsNotEmpty, MaxLength, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for completing a task with evidence
 * Phase 2C: supports 1-3 completion photos
 */
export class CompleteTaskDto {
  @ApiProperty({
    description: 'URLs of the completion photos (1-3, uploaded separately)',
    example: ['https://s3.amazonaws.com/sekar-media/tasks/photo-1.jpg'],
    type: [String],
    minItems: 1,
    maxItems: 3,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  completion_photo_urls: string[];

  @ApiProperty({
    description: 'Completion description detailing what was done',
    example: 'Penyiraman selesai dilakukan, semua tanaman sudah disiram dengan baik',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}
