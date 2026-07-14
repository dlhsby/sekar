import { ArrayMaxSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CapacityItemDto {
  @ApiProperty()
  @IsUUID()
  shift_definition_id: string;

  @ApiProperty({ description: 'Target satgas+linmas headcount (0 = no requirement)', example: 8 })
  @IsInt()
  @Min(0)
  @Max(1000)
  target_count: number;
}

/** Full set of per-shift targets for a location (upserted). */
export class SetLocationCapacityDto {
  @ApiProperty({ type: [CapacityItemDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CapacityItemDto)
  items: CapacityItemDto[];
}
