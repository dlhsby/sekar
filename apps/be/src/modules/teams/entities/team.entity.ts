import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamType } from './team-type.entity';

/**
 * Team (crew) master data (ADR-048). Membership is NOT stored here — it lives on
 * team schedules (ADR-047, Phase 4). A team carries a type + a map marker; when
 * its members are active, monitoring renders it as one group bubble.
 */
@Entity('teams')
export class Team {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Tim Penyiraman Timur 1' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'Team type (crew type)' })
  @Column({ type: 'uuid' })
  team_type_id: string;

  @ManyToOne(() => TeamType, { nullable: false })
  @JoinColumn({ name: 'team_type_id' })
  team_type?: TeamType;

  @ApiPropertyOptional({ example: 'droplets' })
  @Column({ length: 50, nullable: true })
  marker_icon?: string;

  @ApiPropertyOptional({ example: '#69D2E7' })
  @Column({ length: 9, nullable: true })
  marker_color?: string;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

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
