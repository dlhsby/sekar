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
import { AreaType } from '../../area-types/entities/area-type.entity';

/**
 * Area Entity
 *
 * Represents a work location where workers can be assigned.
 * Each area has a GPS center point and radius defining its boundary.
 */
@Entity('areas')
export class Area {
  @ApiProperty({
    description: 'Unique identifier for the area',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the area',
    example: 'Taman Bungkul',
  })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    description: 'Area type ID (foreign key UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Column('uuid')
  area_type_id: string;

  /**
   * Area type relationship
   * onDelete: RESTRICT prevents deletion of area_types that are in use
   */
  @ApiProperty({
    description: 'Area type details',
    type: () => AreaType,
  })
  @ManyToOne(() => AreaType, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'area_type_id' })
  areaType: AreaType;

  @ApiProperty({
    description: 'GPS latitude of area center (-90 to 90)',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @Column('decimal', { precision: 10, scale: 8 })
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude of area center (-180 to 180)',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @Column('decimal', { precision: 11, scale: 8 })
  gps_lng: number;

  @ApiProperty({
    description: 'Boundary radius in meters (1 to 10000)',
    example: 100,
    default: 100,
    minimum: 1,
    maximum: 10000,
  })
  @Column({ default: 100 })
  radius_meters: number;

  @ApiProperty({
    description: 'Physical address of the area',
    example: 'Jl. Taman Bungkul, Darmo, Surabaya',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  address: string;

  @ApiProperty({
    description: 'Whether the area is active',
    example: true,
    default: true,
  })
  @Column({ default: true })
  is_active: boolean;

  // Phase 2 additions
  @ApiProperty({
    description: 'Rayon ID this area belongs to',
    example: '11111111-1111-1111-1111-111111111101',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  rayon_id?: string;

  @ApiProperty({
    description: 'GeoJSON polygon defining area boundary',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [112.7395, -7.2908],
          [112.7401, -7.2908],
          [112.7401, -7.2902],
          [112.7395, -7.2902],
          [112.7395, -7.2908],
        ],
      ],
    },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  boundary_polygon?: object;

  @ApiProperty({
    description: 'Coverage area in square meters',
    example: 2500.5,
    required: false,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  coverage_area?: number;

  @ApiProperty({
    description: 'Timestamp when the area was created',
    example: '2026-01-08T10:00:00.000Z',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the area was last updated',
    example: '2026-01-08T10:00:00.000Z',
  })
  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Soft delete timestamp for data retention
   * CHECK constraints for GPS ranges and radius are implemented in database migration
   */
  @DeleteDateColumn()
  deleted_at?: Date;
}
