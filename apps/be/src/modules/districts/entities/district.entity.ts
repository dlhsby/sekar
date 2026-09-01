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
 * The tier a district's staffing requirements (and understaffing) attach to.
 * Grouped districts define KEBUTUHAN per kawasan (`region`); Taman Aktif defines it
 * per park (`location`); a district may also carry a single whole-district target
 * (`district`). Drives where the "Kebutuhan Petugas" editor + day-board pills sit.
 */
export enum StaffingLevel {
  REGION = 'region',
  LOCATION = 'location',
  DISTRICT = 'district',
}

/**
 * District Entity
 *
 * Represents geographic sectors/districts in Surabaya.
 * Each district contains multiple locations and has a KepalaDistrict assigned.
 *
 * Phase 2: 7 Districts - Selatan, Utara, Pusat, Timur 1, Timur 2, Barat 1, Barat 2
 */
@Entity('districts')
export class District {
  @ApiProperty({
    description: 'Unique identifier for the district',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the district',
    example: 'Rayon Selatan',
  })
  @Column({ length: 100, unique: true })
  name: string;

  @ApiProperty({
    description: 'Description of the district',
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
    description: 'Whether the district is active',
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

  @ApiProperty({
    description: 'Center latitude of the district boundary',
    example: -7.2575,
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  center_lat?: number;

  @ApiProperty({
    description: 'Center longitude of the district boundary',
    example: 112.7521,
    required: false,
  })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  center_lng?: number;

  @ApiProperty({
    description: 'Tier its staffing requirements attach to (region=kawasan / location / district)',
    enum: StaffingLevel,
    default: StaffingLevel.REGION,
  })
  @Column({ type: 'varchar', length: 20, default: StaffingLevel.REGION })
  staffing_level: StaffingLevel;

  @ApiProperty({
    description: 'Timestamp when the district was created',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the district was last updated',
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
