import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsDateString,
  Matches,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOvertimeDto {
  @ApiProperty({ description: 'Overtime date', example: '2026-02-10' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Start time', example: '17:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start_time must be HH:MM format' })
  start_time: string;

  @ApiProperty({ description: 'End time', example: '20:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end_time must be HH:MM format' })
  end_time: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Activity type UUID' })
  @IsUUID()
  @IsNotEmpty()
  activity_type_id: string;

  @ApiProperty({ description: 'Activity description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    type: [String],
    description: 'Photo URLs (1-3 photos)',
    example: ['https://s3.amazonaws.com/photo1.jpg'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  photo_urls: string[];

  @ApiPropertyOptional({ description: 'GPS latitude', example: -7.250445 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  gps_lat?: number;

  @ApiPropertyOptional({ description: 'GPS longitude', example: 112.768845 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  gps_lng?: number;
}
