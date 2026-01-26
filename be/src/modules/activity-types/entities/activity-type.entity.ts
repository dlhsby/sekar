import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ActivityType Entity
 *
 * Represents types of work activities that workers can perform.
 * Activities are role-specific (Worker, Linmas, or both).
 *
 * Phase 2: 10 Activity Types
 * Worker-only: Penyiraman, Penanaman, Pemangkasan, Pemupukan, Perawatan Tanaman
 * Linmas-only: Patroli Keamanan, Laporan Insiden, Pemantauan Pengunjung, Pengecekan Fasilitas
 * Shared: Pembersihan
 */
@Entity('activity_types')
export class ActivityType {
  @ApiProperty({
    description: 'Unique identifier for the activity type',
    example: '33333333-3333-3333-3333-333333333301',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Display name for the activity type',
    example: 'Penyiraman',
  })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    description: 'Unique code for the activity type',
    example: 'WATERING',
  })
  @Column({ length: 50, unique: true })
  code: string;

  @ApiProperty({
    description: 'Description of the activity type',
    example: 'Watering plants and gardens',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Roles that can perform this activity',
    example: ['Worker'],
    type: [String],
  })
  @Column({ type: 'text', array: true })
  applicable_roles: string[];

  @ApiProperty({
    description: 'Whether the activity type is active',
    example: true,
    default: true,
  })
  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({
    description: 'Timestamp when the activity type was created',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the activity type was last updated',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;
}
