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
import { Area } from '../../areas/entities/area.entity';
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
 * AreaStaffRequirement Entity
 *
 * Defines the required number of staff (Satgas/Linmas) for each area
 * per shift and day type.
 *
 * Example: Taman Bungkul, Shift 1, Weekday needs 6 Satgas and 2 Linmas
 */
@Entity('area_staff_requirements')
export class AreaStaffRequirement {
  @ApiProperty({
    description: 'Unique identifier',
    example: '44444444-4444-4444-4444-444444444401',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Area ID',
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

  // Relations
  @ApiProperty({ type: () => Area, description: 'Area for this requirement' })
  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ApiProperty({ type: () => ShiftDefinition, description: 'Shift definition' })
  @ManyToOne(() => ShiftDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_definition_id' })
  shiftDefinition: ShiftDefinition;
}
