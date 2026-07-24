import {
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotInlineMedia } from '../../../common/validators/is-not-inline-media.validator';

/**
 * DTO for updating an existing activity
 *
 * Users can only update their own activities within 1 hour of creation.
 * Can update description and photo_urls.
 */
export class UpdateActivityDto {
  @ApiPropertyOptional({
    description: 'Updated description of the activity',
    example: 'Updated: Completed cleaning Taman Bungkul main area and side gardens.',
  })
  @IsString()
  @MinLength(5, { message: 'Deskripsi minimal 5 karakter' })
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated photo URLs (1-3 photos)',
    type: [String],
    example: [
      'https://sekar-bucket.s3.amazonaws.com/activities/photo1.jpg',
      'https://sekar-bucket.s3.amazonaws.com/activities/photo2.jpg',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 foto diperlukan' })
  @ArrayMaxSize(3, { message: 'Maksimal 3 foto diperbolehkan' })
  @IsString({ each: true })
  @IsNotInlineMedia()
  @IsOptional()
  photo_urls?: string[];
}
