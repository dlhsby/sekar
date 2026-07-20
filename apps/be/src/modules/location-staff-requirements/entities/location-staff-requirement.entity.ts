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
import { Location } from '../../locations/entities/location.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';

export enum DayType {
  WEEKDAY = 'WEEKDAY',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
}

export enum StaffRole {
  SATGAS = 'satgas',
  LINMAS = 'linmas',
}

/**
 * LocationStaffRequirement Entity — a **polymorphic** staffing target.
 *
 * A requirement attaches to exactly one subject: a location, a region (kawasan),
 * or a district — decided by the parent district's `staffing_level` (ADR: grouped
 * districts define KEBUTUHAN per kawasan; Taman Aktif per park). All three ids
 * nullable → a city-wide target (rare). The table keeps its historical name.
 *
 * Example: Taman Bungkul, Shift 1, Weekday needs 6 Satgas and 2 Linmas.
 */
@Entity('location_staff_requirements')
export class LocationStaffRequirement {
  @ApiProperty({
    description: 'Unique identifier',
    example: '44444444-4444-4444-4444-444444444401',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Location ID (set when the requirement is location-level)',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ApiProperty({
    description: 'Region/Kawasan ID (set when the requirement is region-level)',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  region_id?: string | null;

  @ApiProperty({
    description: 'District ID (set when the requirement is district-level)',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  district_id?: string | null;

  @ApiProperty({
    description: 'Shift definition ID',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @Column({ type: 'uuid' })
  shift_definition_id: string;

  @ApiProperty({
    description: 'Role requiring staff',
    enum: StaffRole,
    example: StaffRole.SATGAS,
  })
  @Column({ type: 'varchar', length: 30 })
  role: StaffRole;

  @ApiProperty({
    description: 'Required number of staff',
    example: 6,
    minimum: 0,
  })
  @Column({ type: 'integer', default: 1 })
  required_count: number;

  @ApiProperty({
    description: 'Day type for this requirement',
    enum: DayType,
    example: DayType.WEEKDAY,
    default: DayType.WEEKDAY,
  })
  @Column({ type: 'varchar', length: 20, default: DayType.WEEKDAY })
  day_type: DayType;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;

  // Relations
  @ApiProperty({
    type: () => Location,
    description: 'Location for this requirement',
    nullable: true,
  })
  @ManyToOne(() => Location, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'location_id' })
  area: Location | null;

  @ApiProperty({ type: () => ShiftDefinition, description: 'Shift definition' })
  @ManyToOne(() => ShiftDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_definition_id' })
  shiftDefinition: ShiftDefinition;
}
