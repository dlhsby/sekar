import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('monitoring_configs')
export class MonitoringConfig {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Configuration key', example: 'status_thresholds' })
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @ApiProperty({ description: 'Configuration value as JSON' })
  @Column({ type: 'jsonb' })
  value: Record<string, any>;

  @ApiProperty({ description: 'Human-readable description', nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
