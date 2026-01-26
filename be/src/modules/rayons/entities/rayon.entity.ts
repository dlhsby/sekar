import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Rayon Entity
 *
 * Represents geographic sectors/districts in Surabaya.
 * Each rayon contains multiple areas and has a KepalaRayon assigned.
 *
 * Phase 2: 7 Rayons - Selatan, Utara, Pusat, Timur 1, Timur 2, Barat 1, Barat 2
 */
@Entity('rayons')
export class Rayon {
  @ApiProperty({
    description: 'Unique identifier for the rayon',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the rayon',
    example: 'Rayon Selatan',
  })
  @Column({ length: 100, unique: true })
  name: string;

  @ApiProperty({
    description: 'Unique code for the rayon',
    example: 'SELATAN',
  })
  @Column({ length: 20, unique: true })
  code: string;

  @ApiProperty({
    description: 'Description of the rayon',
    example: 'Covers southern Surabaya districts',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Timestamp when the rayon was created',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the rayon was last updated',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;
}
