import { IsOptional, Matches, IsNumber, Min, Max, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Marker images are either a bundled preset path or an uploaded base64 data-URI
 * limited to the same image types the web picker accepts. Server-side guard so
 * arbitrary data-URIs (e.g. text/html) can never be stored and later rendered.
 */
export const MARKER_IMAGE_PATTERN =
  /^(\/markers\/[A-Za-z0-9._-]+\.(svg|png|webp)|data:image\/(svg\+xml|png|webp|jpe?g);base64,[A-Za-z0-9+/]+=*)$/;
export const MARKER_IMAGE_MESSAGE =
  'marker_image_url must be a preset path (/markers/*.svg) or an image data-URI (svg/png/webp/jpeg)';

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
  @Matches(MARKER_IMAGE_PATTERN, { message: MARKER_IMAGE_MESSAGE })
  marker_image_url?: string;
}
