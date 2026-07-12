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
import { Location } from '../../locations/entities/location.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';

/**
 * User Role Enum
 *
 * Phase 2C: 8 roles with hierarchy:
 * - Satgas: Field worker (formerly Worker)
 * - Linmas: Security officer
 * - Korlap: Field coordinator, manages specific Location (formerly Supervisor/KoordinatorLapangan)
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
  STAFF_KECAMATAN = 'staff_kecamatan',
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
    description: 'Location ID for Korlap role',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  location_id?: string;

  // Phase 3 Apr 27 — staff_kecamatan kecamatan attribution.
  // Each staff_kecamatan user is mapped to one kecamatan; their pruning_requests
  // inherit `kecamatan_name` and `rayon_id` from this profile at submit time.
  // Other roles leave this null.
  @ApiProperty({
    description:
      'Kecamatan name for staff_kecamatan role (free text — no separate Kecamatan table)',
    required: false,
  })
  @Column({ name: 'kecamatan_name', type: 'varchar', length: 100, nullable: true })
  kecamatan_name?: string;

  // May 2026 — promoted to FK; `kecamatan_name` retained for legacy reads.
  @ApiProperty({
    description: 'Kecamatan FK (preferred over free-text `kecamatan_name`)',
    required: false,
  })
  @Column({ name: 'kecamatan_id', type: 'uuid', nullable: true })
  kecamatan_id?: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  area?: Location;

  // The worker's single working shift (one timeframe; may span several areas).
  // Source of truth for the derived roster + clock-in lateness; nullable for
  // management / no-shift roles.
  @ApiProperty({ description: 'Default shift definition (one shift per worker)', required: false })
  @Column({ name: 'shift_definition_id', type: 'uuid', nullable: true })
  shift_definition_id?: string;

  @ManyToOne(() => ShiftDefinition, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shift_definition_id' })
  shift_definition?: ShiftDefinition;

  @Column({ default: true })
  is_active: boolean;

  // Phase 4 sub-phase 4-7 (M3a): set true by admin password reset to force the
  // user through ChangePasswordScreen on next login; cleared by
  // POST /auth/change-password (ADR-041).
  @Column({ name: 'password_must_change', type: 'boolean', default: false })
  password_must_change: boolean;

  // Preferred UI language for web + mobile ('id' | 'en'), synced from the client
  // so the choice follows the user across devices. Defaults to Indonesian.
  // The API itself stays English-canonical; only the frontends localize.
  @Column({ name: 'preferred_language', type: 'varchar', length: 2, default: 'id' })
  preferred_language?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Not persisted — populated by the users-list query (findAllPaginated) with the
  // number of permanent area assignments, for the management grid's Location column.
  @ApiProperty({ description: 'Count of permanent area assignments', required: false })
  assigned_location_count?: number;

  // Not persisted — populated alongside assigned_location_count with the actual
  // area IDs, so the management grid can filter by area without an N+1
  // per-user fetch (GET /users/:id/areas remains the source of truth for
  // full area detail — this is IDs only, for filtering).
  @ApiProperty({
    description: 'IDs of permanent area assignments',
    required: false,
    type: [String],
  })
  assigned_location_ids?: string[];

  @DeleteDateColumn()
  deleted_at?: Date;

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;
}
