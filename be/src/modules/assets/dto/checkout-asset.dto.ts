import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsString, MaxLength, IsISO8601 } from 'class-validator';
import { AssetCondition, CHECKOUT_CONDITIONS } from '../enums/asset.enums';

export class CheckoutAssetDto {
  @ApiPropertyOptional({ description: 'User id to assign asset to (defaults to current user)' })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Expected return date/time (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  expected_return_at?: string;

  @ApiProperty({
    enum: CHECKOUT_CONDITIONS,
    description: 'Asset condition at checkout (good/fair/poor/damaged)',
  })
  @IsEnum(CHECKOUT_CONDITIONS)
  condition_at_checkout: AssetCondition;

  @ApiPropertyOptional({ description: 'Notes about checkout condition' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
