import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SystemConfig — an operator-set override for a catalog key (ADR-049). Only keys
 * an operator has explicitly changed live here; everything else resolves from env
 * or the code default. `value` is AES-GCM ciphertext when `is_secret` is true.
 */
@Entity('system_config')
export class SystemConfig {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'monitoring.idle_threshold_min' })
  @Column({ length: 100, unique: true })
  key: string;

  @ApiProperty({ nullable: true, description: 'Raw string value, or ciphertext when secret' })
  @Column({ type: 'text', nullable: true })
  value?: string | null;

  @ApiProperty({ example: false })
  @Column({ name: 'is_secret', type: 'boolean', default: false })
  is_secret: boolean;

  @ApiProperty({ example: 'number', enum: ['string', 'number', 'boolean'] })
  @Column({ name: 'value_type', length: 10, default: 'string' })
  value_type: string;

  @ApiProperty({ example: 'monitoring' })
  @Column({ name: 'config_group', length: 40 })
  config_group: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
