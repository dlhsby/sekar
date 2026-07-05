import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsISO8601, IsString, MaxLength, IsNumber, Min } from 'class-validator';
import { MaintenanceStatus, AssetCondition } from '../enums/asset.enums';

export class UpdateMaintenanceDto {
  @ApiProperty({ enum: MaintenanceStatus, description: 'Maintenance status' })
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Completion date/time (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  completed_at?: string;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Actual maintenance cost', example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    enum: AssetCondition,
    description: 'Asset condition after maintenance completion',
  })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;
}
