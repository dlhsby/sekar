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
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';

/**
 * Schedule Entity
 *
 * Assigns workers to areas and shifts for specific date ranges.
 * This is how Workers/Linmas are scheduled to work at specific locations.
 *
 * Example: Worker "John" is assigned to "Taman Bungkul" for "Shift 1"
 * starting from 2026-01-20 with no end date (ongoing).
 */
@Entity('schedules')
export class Schedule {
  @ApiProperty({
    description: 'Unique identifier',
    example: '55555555-5555-5555-5555-555555555501',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User (worker/linmas) ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({
    description: 'Area ID where the worker is assigned',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @Column({ type: 'uuid' })
  area_id: string;

  @ApiProperty({
    description: 'Shift definition ID',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @Column({ type: 'uuid' })
  shift_definition_id: string;

  @ApiProperty({
    description: 'Date when this schedule becomes effective',
    example: '2026-01-20',
  })
  @Column({ type: 'date' })
  effective_date: Date;

  @ApiProperty({
    description: 'Date when this schedule ends (null = ongoing)',
    example: '2026-12-31',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  end_date?: Date;

  @ApiProperty({
    description: 'User ID who created this schedule',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;

  // Relations
  @ApiProperty({ type: () => User, description: 'Worker/Linmas assigned' })
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Area, description: 'Assigned area' })
  @ManyToOne(() => Area, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ApiProperty({ type: () => ShiftDefinition, description: 'Shift definition' })
  @ManyToOne(() => ShiftDefinition, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_definition_id' })
  shift_definition: ShiftDefinition;

  @ApiProperty({ type: () => User, description: 'User who created this schedule' })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;
}
