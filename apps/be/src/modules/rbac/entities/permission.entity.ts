import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from './role.entity';

/**
 * Permission — a single `resource:action` capability (ADR-044).
 *
 * Keys are flat and immutable; the UI grouping taxonomy (Category → Resource →
 * actions) lives in the code-side catalog, not in a DB column.
 */
@Entity('permissions')
export class Permission {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Flat resource:action key', example: 'user:read' })
  @Column({ length: 100, unique: true })
  key: string;

  @ApiProperty({ example: 'View users' })
  @Column({ length: 255, nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles?: Role[];
}
