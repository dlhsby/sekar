import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MARKER_IMAGE_PATTERN, MARKER_IMAGE_MESSAGE } from '../../../common/dto/map-style.dto';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export class CreateTeamTypeDto {
  @ApiProperty({ example: 'Penyiraman' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    description: 'Marker image: a preset path (/markers/*.svg) or a base64 data-URI',
    example: '/markers/pin-teal.svg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  @Matches(MARKER_IMAGE_PATTERN, { message: MARKER_IMAGE_MESSAGE })
  marker_image_url?: string;

  @ApiPropertyOptional({
    description: 'Marker color in hex format (#RRGGBB)',
    example: '#22C55E',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(HEX, { message: 'marker_color must be a 6-digit hex color' })
  marker_color?: string;
}

export class UpdateTeamTypeDto extends PartialType(CreateTeamTypeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
