import { IsString, IsUUID, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Tim Penyiraman Timur 1' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Team type id' })
  @IsUUID()
  team_type_id: string;

  @ApiPropertyOptional({ example: 'droplets' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marker_icon?: string;

  @ApiPropertyOptional({ example: '#69D2E7' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'marker_color must be a 6-digit hex color' })
  marker_color?: string;

  @ApiPropertyOptional({
    description: 'Marker image: a preset path (/markers/*.svg) or a base64 data-URI',
    example: '/markers/pin-teal.svg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  marker_image_url?: string;
}
