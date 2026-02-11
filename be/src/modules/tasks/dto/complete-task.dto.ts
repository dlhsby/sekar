import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for completing a task with evidence
 */
export class CompleteTaskDto {
  @ApiProperty({
    description: 'URL of the completion photo (uploaded separately)',
    example: 'https://s3.amazonaws.com/sekar-media/tasks/completion-photo-123.jpg',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  completion_photo_url: string;

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
