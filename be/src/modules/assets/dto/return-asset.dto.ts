import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssetCondition } from '../enums/asset.enums';

export class ReturnAssetDto {
  @ApiProperty({
    enum: AssetCondition,
    description: 'Asset condition at return (good/fair/poor/damaged/unusable)',
  })
  @IsEnum(AssetCondition)
  condition_at_return: AssetCondition;

  @ApiPropertyOptional({
    description: 'Notes about return condition (required if condition worsens)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
