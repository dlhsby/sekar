import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Device platform enum
 */
export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

/**
 * NotificationToken entity for storing FCM device tokens
 *
 * Each user can have multiple devices, each with its own FCM token.
 * Tokens are used to send push notifications to specific devices.
 */
@Entity('notification_tokens')
@Index(['user_id'])
@Index(['fcm_token'])
@Unique(['fcm_token'])
export class NotificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 500 })
  fcm_token: string;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    default: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  device_model: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  app_version: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
