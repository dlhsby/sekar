import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('service_capacity')
@Unique('uq_service_capacity', ['districtId', 'year', 'isoWeek', 'serviceType'])
export class ServiceCapacity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'district_id' })
  districtId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int', name: 'iso_week' })
  isoWeek: number;

  @Column({ type: 'text', name: 'service_type' })
  serviceType: string;

  @Column({ type: 'int', default: 0, name: 'capacity_units' })
  capacityUnits: number;

  @Column({ type: 'int', default: 0, name: 'booked_units' })
  bookedUnits: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
