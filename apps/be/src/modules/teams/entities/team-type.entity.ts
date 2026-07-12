import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TeamType — the crew-type catalog (ADR-048): perawatan / penyiraman /
 * penanaman / penyapuan, extensible at runtime. Managed with `team:manage`.
 */
@Entity('team_types')
export class TeamType {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Penyiraman' })
  @Column({ length: 60, unique: true })
  name: string;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
