import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { Location } from '../../locations/entities/location.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';

/**
 * A monitored worker's state — three values (ADR-046 amendment, 2026-07-16).
 *
 * Inside/outside an area is **not** a status: it is an orthogonal axis carried by
 * `is_within_area` and shown alongside `ACTIVE`/`OFFLINE`. A worker can be active
 * and outside their area; those are two different facts.
 *
 * ⚠️ `OFFLINE` changed meaning. It used to mean *not clocked in* (that is now
 * `ABSENT`); it means *clocked in but unreachable*. Read older code, data dumps
 * and issue reports with that in mind — migration `17505000000000` remapped the
 * rows, but prose predating it uses the old sense.
 */
export enum TrackingStatus {
  /** Clocked in, location fix newer than `monitoring.active_max_age_sec`. */
  ACTIVE = 'active',
  /** Clocked in, but no fix or one older than the threshold — unreachable. */
  OFFLINE = 'offline',
  /**
   * Not clocked in. *Tidak hadir* when a schedule exists — which is the only case
   * that is rendered. A monitorable-but-unscheduled worker (a korlap on their day
   * off) also stores `ABSENT` but is never drawn: ADR-046 says "monitorable but
   * not scheduled" subjects are not rendered by default. Keeping the schedule
   * check in the renderer rather than the calculator is what lets this stay three
   * values; if the stored state ever needs to distinguish them, the value is
   * `off_duty` (*tidak bertugas*) — cf. `schedule-actions.dto.ts`, where `libur`
   * → off is already "a deliberate day off; not counted as absent/expected".
   */
  ABSENT = 'absent',
}

/** The activity half of the two-axis model (see `calculateAxes`). */
export type ActivityStatus = 'aktif' | 'offline' | 'absent';
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
    // A row with no explicit status is a worker who has not clocked in → ABSENT.
    // NOT OFFLINE: after the 5→3 collapse OFFLINE means "clocked in but
    // unreachable", so defaulting to it would mislabel a not-clocked-in worker
    // as clocked-in and count them toward online/staffing.
    default: TrackingStatus.ABSENT,
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
