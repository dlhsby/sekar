import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonitoringScope } from '../enums/monitoring-scope.enum';

export class CreateRoleDto {
  @ApiProperty({ example: 'Pengawas Taman', description: 'Display label' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: MonitoringScope, default: MonitoringScope.NONE })
  @IsOptional()
  @IsEnum(MonitoringScope)
  monitoring_scope?: MonitoringScope;

  @ApiPropertyOptional({ example: 'shield' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marker_icon?: string;

  @ApiPropertyOptional({
    description: 'Marker image: a preset path (/markers/*.svg) or a base64 data-URI',
    example: '/markers/pin-sage.svg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  marker_image_url?: string;

  @ApiPropertyOptional({
    description: 'Role accent colour as a 6-digit hex (#RRGGBB) — drives the user pill/avatar tint',
    example: '#7FBC8C',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'marker_color must be a hex colour like #7FBC8C' })
  marker_color?: string;

  @ApiPropertyOptional({ type: [String], example: ['monitoring:read', 'schedule:read'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];
}
