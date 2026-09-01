import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

/**
 * LocationLog Entity
 *
 * Represents GPS location pings sent by workers during their shifts.
 * Used for real-time tracking and location history.
 */
@Entity('location_logs')
export class LocationLog {
  @ApiProperty({
    description: 'Location log UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User UUID who sent the location ping' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'Shift UUID when location was logged' })
  @Column({ type: 'uuid' })
  shift_id: string;

  @ApiProperty({ description: 'GPS latitude', example: -7.2905 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  gps_lat: number;

  @ApiProperty({ description: 'GPS longitude', example: 112.7398 })
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  gps_lng: number;

  @ApiProperty({
    description: 'GPS accuracy in meters',
    example: 12.5,
    required: false,
  })
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  accuracy_meters?: number;

  @ApiProperty({
    description: 'Device battery level (0-100)',
    example: 85,
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  battery_level?: number;

  @ApiProperty({ description: 'Timestamp when location was captured by device' })
  @Column({ type: 'timestamptz' })
  logged_at: Date;

  /**
   * Why this ping was refused, or `null` when it was accepted.
   *
   * A refused ping is still stored. Dropping it would make a spoofing worker
   * look identical to one whose phone is simply off, which is the opposite of
   * the point: the row is what lets a supervisor see "faking location" rather
   * than a silent gap. What refusal costs the worker is *presence* — a rejected
   * ping never advances tracking status, so they go inactive until they stop.
   *
   * Values are `LocationRejection` (MISSING_COORDINATES | MOCKED |
   * IMPOSSIBLE_TRAVEL). Stored as text rather than a PG enum so a new rule does
   * not need a type migration.
   */
  @ApiProperty({
    description: 'Integrity rejection reason, null when the ping was accepted',
    required: false,
  })
  @Column({ type: 'varchar', length: 32, nullable: true })
  rejection_reason?: string | null;

  @ApiProperty({ description: 'Whether the GPS accuracy was too poor to be reliable' })
  @Column({ type: 'boolean', default: false })
  poor_accuracy: boolean;

  /**
   * `client capture time - server receive time`, in ms. Negative = backdated.
   * Large negatives are normal for the offline queue, so this is recorded for
   * review rather than acted on. `logged_at` itself is clamped.
   */
  @ApiProperty({ description: 'Client/server clock difference for this ping, in ms' })
  @Column({
    type: 'bigint',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value != null ? parseInt(value, 10) : 0),
    },
  })
  clock_skew_ms: number;

  // Relations
  /**
   * User who sent the location ping
   * onDelete: RESTRICT prevents deletion of users with location logs
   */
  @ApiProperty({ type: () => User, description: 'User who sent the location' })
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Shift when location was logged
   * onDelete: CASCADE automatically deletes location logs when shift is deleted
   * This is appropriate since location logs are meaningless without their parent shift
   */
  @ApiProperty({ type: () => Shift, description: 'Shift when location was logged' })
  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}
