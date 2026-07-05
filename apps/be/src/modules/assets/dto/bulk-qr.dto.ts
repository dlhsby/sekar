import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkQrDto {
  @ApiProperty({
    description: 'Array of asset ids (max 50)',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  asset_ids: string[];
}
