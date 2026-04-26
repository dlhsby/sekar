import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_capacity')
export class ServiceCapacity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'rayon_id' })
  rayonId: string;

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
