import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * User Role Enum
 *
 * Phase 2: Extended to 6 roles with hierarchy:
 * - Admin: Full system access
 * - TopManagement: City-wide view (Kepala Dinas, Wali Kota, Kepala Bidang)
 * - KepalaRayon: Manages an entire Rayon
 * - KoordinatorLapangan: Manages specific Area (replaces Supervisor)
 * - Worker: Field worker (Satgas)
 * - Linmas: Security officer
 */
export enum UserRole {
  WORKER = 'worker',
  SUPERVISOR = 'supervisor', // Legacy, maps to koordinator_lapangan
  ADMIN = 'admin',
  TOP_MANAGEMENT = 'top_management',
  KEPALA_RAYON = 'kepala_rayon',
  KOORDINATOR_LAPANGAN = 'koordinator_lapangan',
  LINMAS = 'linmas',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100, nullable: true })
  email?: string;

  @Column({ length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ length: 100 })
  full_name: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({
    type: 'varchar',
    length: 30,
    enum: UserRole,
    default: UserRole.WORKER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Rayon ID for KepalaRayon role',
    example: '11111111-1111-1111-1111-111111111101',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  rayon_id?: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;
}
