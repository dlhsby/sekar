/**
 * Work activities (was WorkReport) and activity types.
 */
import type { Area, User, UserRole } from './user.types';

// Activity approval status
export type ActivityStatus = 'pending' | 'approved' | 'rejected';

// Activity Type
export interface ActivityType {
  id: string;
  name: string;
  code: string;
  description?: string;
  applicable_roles: UserRole[];
  is_active: boolean;
  created_at: string;
}

// Activity (was WorkReport)
export interface Activity {
  id: string;
  user_id: string;
  shift_id: string;
  area_id?: string;
  area?: Area;
  task_id?: string;
  activity_type_id: string;
  activityType?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  user?: User;
  // Activity approval fields
  status?: ActivityStatus;
  reviewed_by?: string;
  reviewer?: User;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}
