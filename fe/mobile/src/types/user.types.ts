/**
 * Users, roles, rayons and areas.
 * Phase 2C: ADR-009 (8-role system), ADR-010 (terminology cleanup).
 */
import type { GeoJsonGeometry } from './geo.types';

// User roles - 8 roles matching backend UserRole enum (lowercase)
// Phase 3: staff_kecamatan added (non-clockable, pruning request submitter)
export type UserRole =
  | 'satgas'
  | 'linmas'
  | 'korlap'
  | 'admin_data'
  | 'kepala_rayon'
  | 'top_management'
  | 'admin_system'
  | 'superadmin'
  | 'staff_kecamatan';

// Area types
export type AreaTypeCode = 'park' | 'pedestrian' | 'mini_garden' | 'street';

// Area type category
export type AreaTypeCategory = 'ACTIVE' | 'PASSIVE';

// User
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  rayon_id?: string;
  rayon?: Rayon;
  area_id?: string;
  area?: Area;
  phone_number?: string | null; // Phase 2E: for phone login
  profile_picture_url?: string | null; // Phase 2E: profile photo
  kecamatan_name?: string | null; // Phase 3 Apr 27: staff_kecamatan attribution
  kecamatan_id?: string | null; // May 2026: kecamatan promoted to FK
  password_must_change?: boolean; // Phase 4-7 M3a: drives ChangePasswordScreen forced flow
  preferred_language?: 'id' | 'en'; // i18n: synced UI language ('id' default)
  created_at?: string;
  updated_at?: string;
}

// Rayon (Sector)
export interface Rayon {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Area Type
export interface AreaType {
  id: string;
  code: AreaTypeCode;
  name: string;
  description: string;
  created_at: string;
}

// Area
export interface Area {
  id: string;
  name: string;
  area_type_id: string;
  areaType?: AreaType;
  rayon_id?: string;
  rayon?: Rayon;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  boundary_polygon?: GeoJsonGeometry;
  address?: string;
  created_at: string;
  updated_at: string;
}
