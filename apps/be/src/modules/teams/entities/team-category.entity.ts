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
