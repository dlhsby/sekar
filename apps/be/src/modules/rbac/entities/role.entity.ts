import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonitoringScope } from '../enums/monitoring-scope.enum';
import { Permission } from './permission.entity';

/**
 * Role — a data-driven role (ADR-044). `code` is immutable and referenced by
 * `users.role` (still a string, not an FK) and by the JWT. `name` is the
 * editable display label. `is_system` locks the seeded roles from delete /
 * code-rename. `monitoring_scope` + marker drive visibility and the map pin.
 */
@Entity('roles')
export class Role {
  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Immutable lowercase role code', example: 'kepala_rayon' })
  @Column({ length: 50, unique: true })
  code: string;

  @ApiProperty({ description: 'Editable display label', example: 'Kepala Rayon' })
  @Column({ length: 100 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Locked seed role (no delete / code-rename)', example: true })
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @ApiProperty({ enum: MonitoringScope, example: MonitoringScope.DISTRICT })
  @Column({ type: 'varchar', length: 20, default: MonitoringScope.NONE })
  monitoring_scope: MonitoringScope;

  @ApiPropertyOptional({ description: 'Map marker icon (curated set)', example: 'building' })
  @Column({ length: 50, nullable: true })
  marker_icon?: string;

  @ApiPropertyOptional({ description: 'Map marker color (hex)', example: '#7FBC8C' })
  @Column({ length: 9, nullable: true })
  marker_color?: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, { cascade: false })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: Permission[];

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
