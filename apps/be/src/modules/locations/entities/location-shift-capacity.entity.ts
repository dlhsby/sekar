import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Staffing target (satgas + linmas) for a location on a given shift. Drives the
 * "kurang" (understaffed) indicator on the schedule board + monitoring. Capacity
 * is defined at the Lokasi level only (ADR follow-up); Kawasan/Rayon show
 * scheduled counts without a target.
 */
@Entity('location_shift_capacity')
@Unique('uq_location_shift_capacity', ['location_id', 'shift_definition_id'])
@Index('idx_location_shift_capacity_location', ['location_id'])
export class LocationShiftCapacity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  location_id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  shift_definition_id: string;

  @ApiProperty({ description: 'Target satgas+linmas headcount for this shift', example: 8 })
  @Column({ type: 'int', default: 0 })
  target_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
