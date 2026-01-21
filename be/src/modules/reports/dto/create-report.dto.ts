import { IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../entities/report.entity';

/**
 * DTO for creating a new work report
 */
export class CreateReportDto {
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
    example: ReportType.TASK_COMPLETION,
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  report_type: ReportType;

  @ApiProperty({
    description: 'Detailed description of the report (5-500 characters)',
    example:
      'Completed cleaning Taman Bungkul main area. All trash collected and disposed properly.',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Deskripsi minimal 5 karakter' })
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
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
}
