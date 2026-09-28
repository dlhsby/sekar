import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  ValidateIf,
  IsArray,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonitoringScope } from '../enums/monitoring-scope.enum';
import { HomeScope } from '../enums/home-scope.enum';

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

  @ApiPropertyOptional({
    enum: HomeScope,
    default: HomeScope.NONE,
    description: 'district = users of this role must have a home rayon',
  })
  @IsOptional()
  @IsEnum(HomeScope)
  home_scope?: HomeScope;

  @ApiPropertyOptional({ nullable: true, minimum: 1, description: 'null = unlimited' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  max_places_per_shift?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, description: 'null = unlimited' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  max_teams_per_shift?: number | null;

  @ApiPropertyOptional({ example: 'shield' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marker_icon?: string;

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
