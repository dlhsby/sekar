import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOvertimeDto {
  @ApiProperty({
    description: 'Start datetime (ISO 8601 with timezone)',
    example: '2026-02-14T17:00:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  start_datetime: string;

  @ApiProperty({
    description: 'End datetime (ISO 8601 with timezone, may cross midnight)',
    example: '2026-02-14T20:00:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  end_datetime: string;

  @ApiProperty({ description: 'Activity type UUID' })
  @IsString()
  @IsNotEmpty()
  activity_type_id: string;

  @ApiProperty({ description: 'Activity description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
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
