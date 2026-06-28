import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AssetCategory } from './asset-category.entity';
import { AssetAssignment } from './asset-assignment.entity';
import { AssetMaintenance } from './asset-maintenance.entity';
import { Area } from '../../areas/entities/area.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { AssetStatus, AssetCondition } from '../enums/asset.enums';

/**
 * Physical asset (tool / equipment / vehicle). Scoped to a rayon and optionally
 * an area. Identified by a human-readable `asset_code` ({PREFIX}-{RAYON}-{SEQ})
 * encoded in a QR (`SEKAR:{asset_code}`, ADR-026).
 */
@Entity('assets')
@Index(['status'])
@Index(['area_id'])
@Index(['rayon_id'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @ManyToOne(() => AssetCategory, (cat) => cat.assets, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: AssetCategory;

  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area: Area | null;

  @Column({ type: 'uuid', nullable: true })
  rayon_id: string | null;

  @ManyToOne(() => Rayon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rayon_id' })
  rayon: Rayon | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  asset_code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: AssetStatus.AVAILABLE })
  status: AssetStatus;

  @Column({ type: 'varchar', length: 20, default: AssetCondition.GOOD })
  condition: AssetCondition;

  @Column({ type: 'date', nullable: true })
  purchase_date: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchase_price: number | null;

  /** S3 object key for the QR PNG (qr-codes/{asset_code}.png). */
  @Column({ type: 'text', nullable: true })
  qr_code_url: string | null;

  /** S3 object key for an optional asset photo. */
  @Column({ type: 'text', nullable: true })
  photo_url: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_maintenance_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  next_maintenance_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;

  @OneToMany(() => AssetAssignment, (a) => a.asset)
  assignments: AssetAssignment[];

  @OneToMany(() => AssetMaintenance, (m) => m.asset)
  maintenances: AssetMaintenance[];
}
