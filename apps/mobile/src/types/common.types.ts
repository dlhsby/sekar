/**
 * Cross-domain models: media, notifications, audit log.
 */

// Media types
export type MediaType = 'photo' | 'video';

// Notification
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

// Phase 2E: Audit log entry (ADR-015)
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  old_value?: any;
  new_value?: any;
  metadata?: any;
  created_at: string;
}
