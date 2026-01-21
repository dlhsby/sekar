import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../entities/report.entity';

/**
 * DTO for creating a work report via JSON with base64 photos
 * Used by mobile app which sends photos as base64 strings
 */
export class CreateReportJsonDto {
  @ApiProperty({
    description: 'Shift UUID when report is being created',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  shift_id: string;

  @ApiProperty({
    description: 'Type of report',
    enum: ReportType,
    example: ReportType.CLEANING,
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  report_type: ReportType;

  @ApiProperty({
    description: 'Detailed description of the report',
    example: 'Completed cleaning Taman Bungkul main area. All trash collected and disposed properly.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'GPS latitude where report is created',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude where report is created',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiProperty({
    description: 'Array of base64-encoded photo strings (max 5 photos)',
    type: [String],
    example: ['data:image/jpeg;base64,/9j/4AAQSkZJRg...'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos?: string[];
}
