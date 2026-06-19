import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AppPlatform = 'android' | 'ios';
export type ReleaseChannel = 'staging' | 'production';

/**
 * A published build of the SEKAR mobile app, surfaced as a download link on the
 * web (login page + dashboard + the public /android · /ios pages). The binary
 * lives in S3 under `storage_key`; the backend issues a fresh presigned URL on
 * each download so the public link stays stable while the signed URL rotates.
 *
 * "Latest" = the newest published row for a (platform, channel) pair.
 */
@Entity('app_releases')
@Index('idx_app_releases_lookup', ['platform', 'channel', 'is_published', 'created_at'])
export class AppRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  platform: AppPlatform;

  @Column({ type: 'varchar', length: 20, default: 'staging' })
  channel: ReleaseChannel;

  /** Semver string from the mobile package.json, e.g. "0.0.1". */
  @Column({ type: 'varchar', length: 50 })
  version: string;

  /** CI build code (e.g. a timestamp like "202606191609") — unique per build. */
  @Column({ type: 'varchar', length: 50 })
  build_number: string;

  /** Android integer versionCode (null for iOS). */
  @Column({ type: 'int', nullable: true })
  version_code: number | null;

  /** S3 object key of the uploaded artifact (APK/AAB/IPA). */
  @Column({ type: 'varchar', length: 500 })
  storage_key: string;

  /** Artifact size in bytes. pg returns bigint as string. */
  @Column({ type: 'bigint', nullable: true })
  file_size: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  is_published: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;
}
