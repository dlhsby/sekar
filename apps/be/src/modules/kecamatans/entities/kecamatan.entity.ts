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
import { Rayon } from '../../rayons/entities/rayon.entity';

export type KecamatanRegion = 'pusat' | 'timur' | 'barat' | 'utara' | 'selatan';

@Entity('kecamatans')
export class Kecamatan {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Wiyung' })
  @Column({ length: 100, unique: true })
  name: string;

  @ApiProperty({ example: 'wiyung' })
  @Column({ length: 50, unique: true })
  code: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'rayon_id' })
  rayon_id: string;

  @ManyToOne(() => Rayon, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rayon_id' })
  rayon?: Rayon;

  @ApiProperty({ enum: ['pusat', 'timur', 'barat', 'utara', 'selatan'] })
  @Column({ length: 20 })
  region: KecamatanRegion;

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
}
