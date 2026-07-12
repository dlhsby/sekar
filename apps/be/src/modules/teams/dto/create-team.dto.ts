import { IsString, IsUUID, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MARKER_IMAGE_PATTERN, MARKER_IMAGE_MESSAGE } from '../../../common/dto/map-style.dto';

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

  @ApiPropertyOptional({
    description: 'Marker image: a preset path (/markers/*.svg) or a base64 data-URI',
    example: '/markers/pin-teal.svg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  @Matches(MARKER_IMAGE_PATTERN, { message: MARKER_IMAGE_MESSAGE })
  marker_image_url?: string;
}
