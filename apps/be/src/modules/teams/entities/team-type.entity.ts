import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * TeamType — the crew-type catalog (ADR-048, Phase 4): perawatan / penyiraman /
 * penanaman / penyapuan, extensible at runtime. Managed with `team:manage`.
 * Concrete team (name, PIC, members, when) live on schedule_events; team_types
 * only define the type + marker.
 */
@Entity('team_types')
export class TeamType {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Penyiraman' })
  @Column({ length: 60, unique: true })
  name: string;

  @ApiPropertyOptional({ description: 'Map marker image (preset path or data-URI)' })
  @Column({ type: 'text', nullable: true })
  marker_image_url?: string | null;

  @ApiPropertyOptional({
    description: 'Marker color in hex format (#RRGGBB)',
    example: '#22C55E',
  })
  @Column({ type: 'varchar', length: 7, nullable: true })
  marker_color?: string | null;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
