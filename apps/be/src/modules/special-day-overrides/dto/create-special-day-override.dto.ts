import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpecialDayType } from '../entities/special-day-override.entity';

export class CreateSpecialDayOverrideDto {
  @ApiProperty({
    description: 'The date for this override',
    example: '2026-08-17',
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Type of special day',
    enum: SpecialDayType,
    example: SpecialDayType.HOLIDAY,
  })
  @IsEnum(SpecialDayType)
  day_type: SpecialDayType;

  @ApiPropertyOptional({
    description: 'Name/description of the special day',
    example: 'Hari Kemerdekaan',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
