import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * TeamCategory — the crew-type catalog (ADR-048, Phase 4): perawatan / penyiraman /
 * penanaman / penyapuan, extensible at runtime. Managed with `team:manage`.
 * Concrete team (name, PIC, members, when) live on schedule_events; team_categories
 * only define the type + marker.
 */
@Entity('team_categories')
export class TeamCategory {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Penyiraman' })
  @Column({ length: 60, unique: true })
  name: string;

  @ApiPropertyOptional({
    description: 'Marker color in hex format (#RRGGBB)',
    example: '#22C55E',
  })
  @Column({ type: 'varchar', length: 7, nullable: true })
  marker_color?: string | null;

  /**
   * Opacity of `marker_color`, 0–1. A team category has ONE colour (unlike the
   * geography tiers, which carry a border/fill pair — ADR-045), so this is the
   * single alpha applied wherever that colour is drawn. Null → fully opaque,
   * matching how the marker rendered before the field existed.
   */
  @ApiPropertyOptional({
    description: 'Opacity of marker_color, 0–1. Null → 1 (opaque).',
    example: 0.8,
    minimum: 0,
    maximum: 1,
  })
  @Column({ type: 'real', nullable: true })
  marker_opacity?: number | null;

  @ApiPropertyOptional({
    description: 'Marker glyph name from the curated set (e.g. "droplets"); null → default.',
    example: 'droplets',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  marker_icon?: string | null;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
