import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { OvertimeAktivitas } from './overtime-aktivitas.entity';

export enum OvertimeStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('overtimes')
export class Overtime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('uuid', { nullable: true })
  area_id?: string;

  @Column('date')
  date: string;

  @Column('time')
  start_time: string;

  @Column('time')
  end_time: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: OvertimeStatus,
    default: OvertimeStatus.PENDING,
  })
  status: OvertimeStatus;

  @Column('uuid', { nullable: true })
  approved_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at?: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area?: Area;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @OneToMany(() => OvertimeAktivitas, (oa) => oa.overtime, {
    cascade: true,
    eager: true,
  })
  aktivitas: OvertimeAktivitas[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
