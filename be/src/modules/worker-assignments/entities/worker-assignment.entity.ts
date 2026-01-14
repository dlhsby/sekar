import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';

/**
 * WorkerAssignment Entity
 *
 * Represents the assignment of a worker to a specific work area.
 * For MVP, one worker can only be assigned to one area at a time.
 */
@Entity('worker_assignments')
export class WorkerAssignment {
  @ApiProperty({
    description: 'Unique identifier for the assignment',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Worker UUID (foreign key to users table)',
    example: 'f634880a-7498-449a-a293-9c5204176300',
  })
  @Column('uuid')
  worker_id: string;

  @ApiProperty({
    description: 'Worker details',
    type: () => User,
  })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @ApiProperty({
    description: 'Area UUID (foreign key to areas table)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @Column('uuid')
  area_id: string;

  @ApiProperty({
    description: 'Area details',
    type: () => Area,
  })
  @ManyToOne(() => Area, { eager: true })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ApiProperty({
    description: 'Timestamp when the worker was assigned to this area',
    example: '2026-01-08T10:00:00.000Z',
  })
  @CreateDateColumn()
  assigned_at: Date;
}
