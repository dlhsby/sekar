import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { Location } from '../../locations/entities/location.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';

export enum TrackingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUTSIDE_AREA = 'outside_area',
  MISSING = 'missing',
  OFFLINE = 'offline',
}

export type ActivityStatus = 'aktif' | 'idle' | 'missing' | 'offline';
export type LocationStatus = 'dalam_area' | 'luar_area' | 'unknown';

@Entity('user_tracking_status')
export class UserTrackingStatus {
  @ApiProperty({ description: 'User ID (primary key)' })
  @PrimaryColumn('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Current shift ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  shift_id: string | null;

  @ManyToOne(() => Shift, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({ description: 'Current shift definition ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  shift_definition_id: string | null;

  @ManyToOne(() => ShiftDefinition, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_definition_id' })
  shift_definition: ShiftDefinition;

  @ApiProperty({ description: 'Tracking status', enum: TrackingStatus })
  @Column({
    type: 'varchar',
    length: 20,
    default: TrackingStatus.OFFLINE,
  })
  status: TrackingStatus;

  @ApiProperty({ description: 'Last known latitude', nullable: true })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  last_latitude: number | null;

  @ApiProperty({ description: 'Last known longitude', nullable: true })
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  last_longitude: number | null;

  @ApiProperty({ description: 'Last GPS accuracy in meters', nullable: true })
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  last_accuracy_meters: number | null;

  @ApiProperty({ description: 'Last battery level (0-100)', nullable: true })
  @Column({ type: 'integer', nullable: true })
  last_battery_level: number | null;

  @ApiProperty({ description: 'Timestamp of last location update', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_location_at: Date | null;

  @ApiProperty({ description: 'Whether user is within their assigned area' })
  @Column({ type: 'boolean', default: true })
  is_within_area: boolean;

  @ApiProperty({ description: 'Current area ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ManyToOne(() => Location, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'location_id' })
  area: Location;

  @ApiProperty({ description: 'Rayon ID for admin_rayon/kepala_rayon tracking', nullable: true })
  @Column({ name: 'rayon_id', type: 'uuid', nullable: true })
  rayon_id: string | null;

  @ManyToOne(() => Rayon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rayon_id' })
  rayon: Rayon;

  @UpdateDateColumn()
  updated_at: Date;
}
