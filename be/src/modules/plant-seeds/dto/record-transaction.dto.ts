import { IsUUID, IsIn, IsNumber, Min, IsOptional, IsString, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RecordTransactionDto {
  @IsUUID()
  @ApiProperty({ description: 'Seed ID', example: 'seed-11111111-1111-1111-1111-111111111111' })
  seedId: string;

  @IsIn(['purchase', 'distribution', 'adjustment'])
  @ApiProperty({
    description: 'Transaction type',
    enum: ['purchase', 'distribution', 'adjustment'],
  })
  transactionType: 'purchase' | 'distribution' | 'adjustment';

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ description: 'Quantity', example: 100 })
  qty: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ description: 'Unit price', example: 5000, required: false })
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ description: 'Supplier name', example: 'PT Kebun Maju', required: false })
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({ description: 'Receipt/document URL', example: 'https://...', required: false })
  receiptUrl?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Target rayon ID for distribution', required: false })
  toRayonId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'Target area ID for distribution', required: false })
  toAreaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({
    description: 'Recipient name for distribution',
    example: 'Pak Joko',
    required: false,
  })
  recipientName?: string;

  @Type(() => Date)
  @IsDate()
  @ApiProperty({ description: 'Transaction date (ISO 8601 date)', example: '2026-04-27' })
  occurredAt: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({ description: 'Additional notes', required: false })
  notes?: string;
}
