import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description: 'Hex color for the rayon boundary on the monitoring map',
    example: '#7FBC8C',
  })
  @Column({ length: 9, nullable: true })
  color?: string;

  @ApiProperty({
    description: 'Description of the rayon',
    example: 'Covers southern Surabaya districts',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'GeoJSON Polygon boundary computed from child area polygons',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  boundary_polygon?: object;

  @ApiProperty({
    description: 'Center latitude of the rayon boundary',
    example: -7.2575,
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  center_lat?: number;

  @ApiProperty({
    description: 'Center longitude of the rayon boundary',
    example: 112.7521,
    required: false,
  })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  center_lng?: number;

  @ApiProperty({
    description: 'Timestamp when the boundary was last computed',
    required: false,
  })
  @Column({ type: 'timestamptz', nullable: true })
  boundary_computed_at?: Date;

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

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;
}
