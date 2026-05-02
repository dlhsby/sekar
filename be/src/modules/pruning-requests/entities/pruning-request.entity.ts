import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PruningRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'converted'
  | 'in_progress'
  | 'done'
  | 'cancelled';

@Entity('pruning_requests')
export class PruningRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true, name: 'reference_code' })
  referenceCode: string;

  @Column({ type: 'uuid', name: 'submitted_by' })
  submittedBy: string;

  @Column({ type: 'text', name: 'kecamatan_name' })
  kecamatanName: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'numeric', precision: 10, scale: 8, nullable: true, name: 'gps_lat' })
  gpsLat: number | null;

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true, name: 'gps_lng' })
  gpsLng: number | null;

  @Column({ type: 'date', nullable: true, name: 'expected_date' })
  expectedDate: Date | null;

  // ADR-035 amendment 2026-05-01: kecamatan submitter picks an ISO week; the
  // concrete `expectedDate` is set later by admin_data at convert-to-task or
  // by the convert auto-pick.
  @Column({ type: 'int', nullable: true, name: 'expected_year' })
  expectedYear: number | null;

  @Column({ type: 'int', nullable: true, name: 'expected_iso_week' })
  expectedIsoWeek: number | null;

  @Column({ type: 'int', nullable: true, name: 'estimated_plant_count' })
  estimatedPlantCount: number | null;

  // Phase 3 Apr 27 — staff_kecamatan redesign added per-tree details + contacts.
  @Column({ type: 'int', nullable: true, name: 'tree_count' })
  treeCount: number | null;

  @Column({ type: 'text', nullable: true, name: 'tree_height_estimate' })
  treeHeightEstimate: string | null;

  @Column({ type: 'text', nullable: true, name: 'tree_diameter_estimate' })
  treeDiameterEstimate: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'requester_name' })
  requesterName: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'requester_phone' })
  requesterPhone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'rt_leader_name' })
  rtLeaderName: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'rt_leader_phone' })
  rtLeaderPhone: string | null;

  @Column({ type: 'text', array: true, default: '{}', name: 'photo_urls' })
  photoUrls: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', default: 'submitted' })
  status: PruningRequestStatus;

  @Column({ type: 'uuid', nullable: true, name: 'rayon_id' })
  rayonId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'converted_task_id' })
  convertedTaskId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
