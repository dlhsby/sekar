import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, IsNumber, Min } from 'class-validator';
import { MaintenanceType } from '../enums/asset.enums';

export class CreateMaintenanceDto {
  @ApiProperty({ enum: MaintenanceType, description: 'Type of maintenance' })
  @IsEnum(MaintenanceType)
  maintenance_type: MaintenanceType;

  @ApiProperty({ description: 'Scheduled maintenance date/time (ISO 8601)' })
  @IsISO8601()
  scheduled_at: string;

  @ApiPropertyOptional({ description: 'Maintenance description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Maintenance cost', example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
