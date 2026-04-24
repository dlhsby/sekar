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
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Area } from '../../areas/entities/area.entity';

/**
 * User Role Enum
 *
 * Phase 2C: 8 roles with hierarchy:
 * - Satgas: Field worker (formerly Worker)
 * - Linmas: Security officer
 * - Korlap: Field coordinator, manages specific Area (formerly Supervisor/KoordinatorLapangan)
 * - AdminData: Data entry and reporting
 * - KepalaRayon: Manages an entire Rayon
 * - TopManagement: City-wide view (Kepala Dinas, Wali Kota, Kepala Bidang)
 * - AdminSystem: System configuration and management
 * - Superadmin: Full system access (formerly Admin)
 */
export enum UserRole {
  SATGAS = 'satgas',
  LINMAS = 'linmas',
  KORLAP = 'korlap',
  ADMIN_DATA = 'admin_data',
  KEPALA_RAYON = 'kepala_rayon',
  TOP_MANAGEMENT = 'top_management',
  ADMIN_SYSTEM = 'admin_system',
  SUPERADMIN = 'superadmin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ length: 100 })
  full_name: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phone_number: string | null;

  @Column({ name: 'profile_picture_url', type: 'text', nullable: true })
  profile_picture_url: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    enum: UserRole,
    default: UserRole.SATGAS,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Rayon ID for KepalaRayon role',
    example: '11111111-1111-1111-1111-111111111101',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  rayon_id?: string;

  @ApiProperty({
    description: 'Area ID for Korlap role',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  area_id?: string;

  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area?: Area;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;
}
