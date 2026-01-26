import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SpecialDayType {
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
  SPECIAL = 'SPECIAL',
}

/**
 * SpecialDayOverride Entity
 *
 * Defines dates that should be treated differently for staffing requirements.
 * For example, national holidays like "Hari Kemerdekaan" would use HOLIDAY
 * day type, which might have different staffing requirements.
 *
 * Example: 2026-08-17 is marked as HOLIDAY "Hari Kemerdekaan"
 */
@Entity('special_day_overrides')
export class SpecialDayOverride {
  @ApiProperty({
    description: 'Unique identifier',
    example: '66666666-6666-6666-6666-666666666601',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The date for this override',
    example: '2026-08-17',
  })
  @Column({ type: 'date', unique: true })
  date: Date;

  @ApiProperty({
    description: 'Type of special day',
    enum: SpecialDayType,
    example: SpecialDayType.HOLIDAY,
  })
  @Column({ type: 'varchar', length: 20 })
  day_type: SpecialDayType;

  @ApiProperty({
    description: 'Name/description of the special day',
    example: 'Hari Kemerdekaan',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
