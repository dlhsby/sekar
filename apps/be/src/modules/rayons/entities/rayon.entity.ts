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
 * The tier a rayon's staffing requirements (and understaffing) attach to.
 * Grouped rayons define KEBUTUHAN per kawasan (`region`); Taman Aktif defines it
 * per park (`location`); a rayon may also carry a single whole-rayon target
 * (`rayon`). Drives where the "Kebutuhan Petugas" editor + day-board pills sit.
 */
export enum StaffingLevel {
  REGION = 'region',
  LOCATION = 'location',
  RAYON = 'rayon',
}

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
    description: 'Whether the rayon is active',
    example: true,
    default: true,
  })
  @Column({ default: true })
  is_active: boolean;

  // ── Per-level map styling (ADR-045) ──
  @ApiPropertyOptional({ example: '#1C1917' })
  @Column({ length: 9, nullable: true })
  border_color?: string;

  @ApiPropertyOptional({ example: '#7FBC8C' })
  @Column({ length: 9, nullable: true })
  fill_color?: string;

  @ApiPropertyOptional({ example: 0.8 })
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  border_opacity?: number;

  @ApiPropertyOptional({ example: 0.25 })
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  fill_opacity?: number;

  @ApiPropertyOptional({ example: 'building' })
  @Column({ length: 50, nullable: true })
  marker_icon?: string;

  @ApiPropertyOptional({ description: 'Map marker image (preset path or data-URI)' })
  @Column({ type: 'text', nullable: true })
  marker_image_url?: string;

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
    description: 'Tier its staffing requirements attach to (region=kawasan / location / rayon)',
    enum: StaffingLevel,
    default: StaffingLevel.REGION,
  })
  @Column({ type: 'varchar', length: 20, default: StaffingLevel.REGION })
  staffing_level: StaffingLevel;

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
