import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { District } from '../../districts/entities/district.entity';

export type PruningRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'assigned'
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

  // May 9, 2026 — explicit relation so the API can return submitter context
  // (full_name / username / role) for the list card + detail screen header.
  // Column already exists (`submitted_by`); we only add the join, no schema
  // change. `onDelete: 'RESTRICT'` matches the migration
  // (`17460000000000-Phase3Schema.ts:70`). Pruning requests are part of the
  // audit trail: deleting a kecamatan submitter must not silently destroy
  // their history. Soft-delete users instead, or reassign requests before
  // hard-delete via `npm run db:fix-orphans`.
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'submitted_by' })
  submitter?: User;

  @Column({ type: 'text', name: 'kecamatan_name' })
  kecamatanName: string;

  // May 2026 — kecamatan promoted to FK; `kecamatanName` denormalized copy
  // remains for read-side compatibility with older clients.
  @Column({ type: 'uuid', nullable: true, name: 'kecamatan_id' })
  kecamatanId?: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'numeric', precision: 10, scale: 8, nullable: true, name: 'gps_lat' })
  gpsLat: number | null;

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true, name: 'gps_lng' })
  gpsLng: number | null;

  @Column({ type: 'date', nullable: true, name: 'expected_date' })
  expectedDate: Date | null;

  // ADR-035 amendment 2026-05-01: kecamatan submitter picks an ISO week; the
  // concrete `expectedDate` is set later by admin_rayon at assign-to-task or
  // by the convert auto-pick.
  @Column({ type: 'int', nullable: true, name: 'expected_year' })
  expectedYear: number | null;

  @Column({ type: 'int', nullable: true, name: 'expected_iso_week' })
  expectedIsoWeek: number | null;

  // May 9, 2026 — admin-confirmed work day. Set by admin_rayon via
  // `/assign-to-task` (auto-picked from the booked week) or via the
  // "Atur Jadwal" reschedule endpoint. This replaces the previous overload
  // of `expected_date`, which stays NULL going forward (kept on the
  // schema as a legacy column for potential future re-use).
  @Column({ type: 'date', nullable: true, name: 'scheduled_date' })
  scheduledDate: Date | null;

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

  @Column({ type: 'uuid', nullable: true, name: 'district_id' })
  districtId: string | null;

  // May 9, 2026 — relation for `request.district?.name` on detail screen.
  @ManyToOne(() => District, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'district_id' })
  district?: District;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  // May 9, 2026 — reviewer relation for the "Direview Oleh" detail row.
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_task_id' })
  assignedTaskId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
