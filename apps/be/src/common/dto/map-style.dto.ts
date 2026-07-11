import { IsOptional, Matches, IsNumber, Min, Max, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Per-level map styling fields (ADR-045) — shared by rayon/region/area DTOs.
 * Separate border + fill color, each with an independent 0–1 opacity, plus a
 * marker icon + color. All optional; colors validate as 6-digit hex.
 */
export class MapStyleDto {
  @ApiPropertyOptional({ example: '#1C1917' })
  @IsOptional()
  @Matches(HEX, { message: 'border_color must be a 6-digit hex color' })
  border_color?: string;

  @ApiPropertyOptional({ example: '#7FBC8C' })
  @IsOptional()
  @Matches(HEX, { message: 'fill_color must be a 6-digit hex color' })
  fill_color?: string;

  @ApiPropertyOptional({ example: 0.8, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  border_opacity?: number;

  @ApiPropertyOptional({ example: 0.25, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  fill_opacity?: number;

  @ApiPropertyOptional({ example: 'trees' })
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
}
