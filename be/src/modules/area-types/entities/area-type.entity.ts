import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * AreaType Entity
 *
 * Represents the types of areas where workers can be assigned.
 * This is a lookup/master data table with predefined values.
 */
@Entity('area_types')
export class AreaType {
  @ApiProperty({
    description: 'Unique identifier for the area type',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Unique code for the area type',
    example: 'park',
    enum: ['park', 'pedestrian', 'mini_garden', 'street'],
  })
  @Column({ length: 20, unique: true })
  code: string;

  @ApiProperty({
    description: 'Display name for the area type',
    example: 'Park',
  })
  @Column({ length: 50 })
  name: string;

  @ApiProperty({
    description: 'Detailed description of the area type',
    example: 'Public park or garden',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Timestamp when the area type was created',
    example: '2026-01-08T10:00:00.000Z',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the area type was last updated',
    example: '2026-01-08T10:00:00.000Z',
  })
  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Soft delete timestamp for data retention
   * When set, the area type is considered deleted but preserved in database
   */
  @DeleteDateColumn()
  deleted_at?: Date;
}
