import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export class CreateTeamCategoryDto {
  @ApiProperty({ example: 'Penyiraman' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    description: 'Marker color in hex format (#RRGGBB)',
    example: '#22C55E',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(HEX, { message: 'marker_color must be a 6-digit hex color' })
  marker_color?: string;

  @ApiPropertyOptional({
    description: 'Marker glyph name from the curated set (e.g. "droplets")',
    example: 'droplets',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marker_icon?: string;
}

export class UpdateTeamCategoryDto extends PartialType(CreateTeamCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
