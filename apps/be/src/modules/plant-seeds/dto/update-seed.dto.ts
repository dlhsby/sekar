import { IsString, IsUUID, IsIn, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSeedDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Seed SKU name/identifier',
    example: 'Bibit Pucuk Merah A',
    required: false,
  })
  nameId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Plant species ID', example: null, required: false })
  speciesId?: string | null;

  @IsOptional()
  @IsIn(['gram', 'piece', 'packet'])
  @ApiProperty({
    description: 'Unit of measurement',
    enum: ['gram', 'piece', 'packet'],
    required: false,
  })
  unit?: 'gram' | 'piece' | 'packet';
}
