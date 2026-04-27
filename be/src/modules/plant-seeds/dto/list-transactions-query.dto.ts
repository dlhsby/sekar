import { IsOptional, IsString, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListTransactionsQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Filter by transaction type', required: false })
  type?: 'purchase' | 'distribution' | 'adjustment';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({ description: 'From date (ISO 8601)', required: false })
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({ description: 'To date (ISO 8601)', required: false })
  to?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ description: 'Page number', example: 1, required: false })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiProperty({ description: 'Limit per page', example: 20, required: false })
  limit?: number = 20;
}
