import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Asset } from './asset.entity';
import { User } from '../../users/entities/user.entity';
import { AssetCondition } from '../enums/asset.enums';

/**
 * Checkout/return record for an asset. At most one active assignment
 * (returned_at IS NULL) per asset — enforced by a partial unique index.
 */
@Entity('asset_assignments')
@Index(['asset_id'])
@Index(['assigned_to'])
export class AssetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  asset_id: string;

  @ManyToOne(() => Asset, (asset) => asset.assignments, { nullable: false })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'uuid' })
  assigned_to: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ type: 'uuid' })
  assigned_by: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  checked_out_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expected_return_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  returned_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  returned_to: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'returned_to' })
  returnedTo: User | null;

  @Column({ type: 'varchar', length: 20 })
  condition_at_checkout: AssetCondition;

  @Column({ type: 'varchar', length: 20, nullable: true })
  condition_at_return: AssetCondition | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
