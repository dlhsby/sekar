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
 * Region (Kawasan) — the level between Rayon and Location (ADR-045). New master data
 * drawn fresh on the map; areas are re-parented into regions. Carries its own
 * per-level map styling (separate border/fill color + opacity) and marker.
 */
@Entity('regions')
export class Region {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Kawasan Darmo' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'Parent rayon' })
  @Column({ type: 'uuid' })
  rayon_id: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: 'GeoJSON Polygon/MultiPolygon boundary' })
  @Column({ type: 'jsonb', nullable: true })
  boundary_polygon?: object;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  center_lat?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  center_lng?: number;

  // ── Per-level map styling (ADR-045) ──────────────────────────────────────
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

  @ApiPropertyOptional({ example: 'trees' })
  @Column({ length: 50, nullable: true })
  marker_icon?: string;

  @ApiPropertyOptional({ description: 'Map marker image (preset path or data-URI)' })
  @Column({ type: 'text', nullable: true })
  marker_image_url?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;
}
