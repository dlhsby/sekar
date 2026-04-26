import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seed_transactions')
export class SeedTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'seed_id' })
  seedId: string;

  @Column({ type: 'text', name: 'transaction_type' })
  transactionType: 'purchase' | 'distribution' | 'adjustment';

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  qty: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, name: 'unit_price' })
  unitPrice: number | null;

  @Column({ type: 'text', nullable: true })
  supplier: string | null;

  @Column({ type: 'text', nullable: true, name: 'receipt_url' })
  receiptUrl: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'to_rayon_id' })
  toRayonId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'to_area_id' })
  toAreaId: string | null;

  @Column({ type: 'text', nullable: true, name: 'recipient_name' })
  recipientName: string | null;

  @Column({ type: 'date', name: 'occurred_at' })
  occurredAt: Date;

  @Column({ type: 'uuid', name: 'recorded_by' })
  recordedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
