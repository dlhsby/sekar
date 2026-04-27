import { IsString, IsUUID, IsIn, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSeedDto {
  @IsString()
  @ApiProperty({ description: 'Seed SKU name/identifier', example: 'Bibit Pucuk Merah A' })
  nameId: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Plant species ID', example: null, required: false })
  speciesId?: string;

  @IsIn(['gram', 'piece', 'packet'])
  @ApiProperty({ description: 'Unit of measurement', enum: ['gram', 'piece', 'packet'] })
  unit: 'gram' | 'piece' | 'packet';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ description: 'Initial stock quantity', example: 0, required: false })
  stockQty?: number;
}
