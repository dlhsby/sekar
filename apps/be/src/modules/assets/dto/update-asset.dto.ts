import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateAssetDto } from './create-asset.dto';
import { AssetStatus, AssetCondition } from '../enums/asset.enums';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @ApiPropertyOptional({ enum: AssetStatus, description: 'Update asset status (for retire/lost)' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Update asset condition' })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;
}
