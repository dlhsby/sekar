/**
 * Data Models
 * TypeScript interfaces for all data models used in the app
 * Phase 2C: ADR-009 (8-role system), ADR-010 (terminology cleanup)
 */

/** GeoJSON Polygon as stored in the backend (jsonb column).
 *  coordinates[0] is the outer ring: [[lng, lat], ...] pairs. */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

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

// Media types
export type MediaType = 'photo' | 'video';

// Task status - 8 values (Phase 2C: accept/decline + verify/revision)
export type TaskStatus = 'pending' | 'assigned' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'verified' | 'revision_needed';

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Overtime status — Phase 2E adds 'in_progress' for clock-in/out redesign
export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'in_progress';

// Activity approval status
export type ActivityStatus = 'pending' | 'approved' | 'rejected';

// Day type for scheduling
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

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
  phone_number?: string | null;         // Phase 2E: for phone login
  profile_picture_url?: string | null;  // Phase 2E: profile photo
  kecamatan_name?: string | null;       // Phase 3 Apr 27: staff_kecamatan attribution
  kecamatan_id?: string | null;         // May 2026: kecamatan promoted to FK
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
  area_type?: AreaType;
  rayon_id?: string;
  rayon?: Rayon;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  boundary_polygon?: GeoJsonPolygon;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Shift
export interface Shift {
  id: string;
  user_id: string;
  area_id: string | null; // Phase 2C: nullable, auto-detected
  area?: Area;
  user?: User;
  clock_in_time: string;
  clock_in_gps_lat: number;
  clock_in_gps_lng: number;
  clock_in_photo_url?: string;
  clock_in_outside_boundary?: boolean;
  clock_out_time?: string;
  clock_out_gps_lat?: number;
  clock_out_gps_lng?: number;
  clock_out_outside_boundary?: boolean;
  is_overtime?: boolean; // Phase 2E: true when shift is an overtime shift
  created_at: string;
  updated_at: string;
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

// Location Ping (LocationLog in backend)
export interface LocationPing {
  id?: string;
  user_id?: string;
  shift_id?: string;
  timestamp: string;
  gps_lat: number;
  gps_lng: number;
  accuracy_meters: number;
  created_at?: string;
}

// GPS Coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// Active User (for supervisor map, was ActiveWorker)
export interface ActiveUser {
  user_id: string;
  full_name: string;
  role: UserRole;
  area_name: string;
  area_type: string;
  current_gps_lat: number;
  current_gps_lng: number;
  clock_in_time: string;
  last_ping_time: string;
}

// Attendance Record
export interface AttendanceRecord {
  user_id: string;
  full_name: string;
  area_name: string;
  area_type: string;
  clock_in_time?: string;
  clock_out_time?: string;
  hours_worked: number;
  activities_count: number;
}

// Dashboard Summary (for field roles, was WorkerDashboard)
export interface FieldDashboard {
  current_shift?: Shift;
  today_activities_count: number;
  today_hours_worked: number;
  assigned_area?: Area;
  pending_sync_count: number;
}

// =====================
// Phase 2 Models
// =====================

// Rayon (Sector)
export interface Rayon {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Shift Definition (fixed shifts)
export interface ShiftDefinition {
  id: string;
  name: string;
  code: string;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  crosses_midnight: boolean;
  is_active: boolean;
  created_at: string;
}

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

// Area Staff Requirements
export interface AreaStaffRequirement {
  id: string;
  area_id: string;
  area?: Area;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  role: UserRole;
  required_count: number;
  day_type: DayType;
  created_at: string;
  updated_at: string;
}

// Schedule (was WorkerSchedule)
export interface Schedule {
  id: string;
  user_id: string;
  user?: User;
  area_id: string;
  area?: Area;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  effective_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Task Tag (Phase 2C)
export interface TaskTag {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  created_at: string;
}

// Task (Phase 2C: accept/decline + verify/revision support, optional area_id, rayon support)
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  area_id?: string;
  area?: Area;
  rayon_id?: string;
  rayon?: Rayon;
  assigned_to?: string;
  assignee?: User;
  created_by: string;
  creator?: User;
  completion_photo_urls?: string[];
  completion_notes?: string;
  completed_at?: string;
  started_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  verified_by?: string;
  verifier?: User;
  verified_at?: string;
  revision_reason?: string;
  tags?: TaskTag[];
  created_at: string;
  updated_at: string;
}

// Overtime (Phase 2C: flat structure, datetime-based, overnight support)
// Phase 2E: adds shift_id for clock-in/out flow redesign; end_datetime optional for in_progress
export interface Overtime {
  id: string;
  user_id: string;
  user?: User;
  area_id?: string;
  area?: Area;
  shift_id?: string | null;  // Phase 2E: linked shift when using clock-in/out flow
  shift?: {                  // Phase 2E: shift relation for selfie photo URLs
    id: string;
    clock_in_photo_url?: string | null;
    clock_out_photo_url?: string | null;
  } | null;
  start_datetime: string;    // ISO 8601 e.g. "2026-02-14T17:00:00+07:00"
  end_datetime?: string;     // Phase 2E: optional — null while in_progress
  reason?: string;           // Phase 2E: why the user is doing overtime (start form)
  status: OvertimeStatus;
  activity_type_id?: string; // Phase 2E: optional — set on end
  activityType?: ActivityType;
  description?: string;      // Phase 2E: optional — set on end
  photo_urls?: string[];     // Phase 2E: optional — set on end
  gps_lat?: number;
  gps_lng?: number;
  approved_by?: string;
  approved_at?: string;
  approver?: User;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

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

// Tracking status — Phase 2D: server-computed five-status model
export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';

// Monitoring Stats
export interface MonitoringStats {
  total_users: number;
  online_users: number;
  offline_users: number;
  total_areas: number;
  staffed_areas: number;
  understaffed_areas: number;
  tasks_pending: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
}

// Live User (was LiveWorker) — matches backend Phase 2D LiveUserDto
export interface LiveUser {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  outside_boundary: boolean;
  shift_id: string;
  shift_name: string;
  shift_definition_id: string | null;
  clock_in_time: string;
  current_task_status: string | null;
  current_task_title: string | null;
}

// Live Users Response — Phase 2D
export interface LiveUsersResponse {
  total_active: number;
  total_inactive: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  /** @deprecated Use total_active */
  total_online: number;
  users: LiveUser[];
  generated_at: string;
}

// =====================
// Phase 3 Models
// =====================

// Pruning Request Status
export type PruningRequestStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted' | 'in_progress' | 'done' | 'cancelled';

// Pruning Request — Phase 3 sub-phase 3-9/3-10
// Staff kecamatan submits requests for pruning work; admin_data reviews/converts to tasks
export interface PruningRequest {
  id: string;
  referenceCode: string;
  submittedBy: string;
  submitter?: User;
  kecamatanName: string;
  address: string;
  gpsLat: number | null;
  gpsLng: number | null;
  expectedDate: string | null; // ISO date (YYYY-MM-DD)
  estimatedPlantCount: number | null;
  // Phase 3 Apr 27 — staff_kecamatan redesign
  treeCount?: number | null;
  treeHeightEstimate?: string | null;
  treeDiameterEstimate?: string | null;
  requesterName?: string | null;
  requesterPhone?: string | null;
  rtLeaderName?: string | null;
  rtLeaderPhone?: string | null;
  photoUrls: string[];
  notes: string | null;
  status: PruningRequestStatus;
  rayonId: string | null;
  rayon?: Rayon;
  reviewedBy: string | null;
  reviewer?: User;
  reviewedAt: string | null;
  reviewNotes: string | null;
  convertedTaskId: string | null;
  convertedTask?: Task;
  createdAt: string;
  updatedAt: string;
}

// User Day Summary — Phase 2D
export interface UserDaySummary {
  user_id: string;
  full_name: string;
  username: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  shift: {
    id: string;
    name: string;
    clock_in_time: string;
    clock_out_time: string | null;
    duration_minutes: number;
    outside_boundary: boolean;
  } | null;
  last_location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    battery_level: number | null;
    logged_at: string;
    is_within_area: boolean;
  } | null;
  activities_today: {
    id: string;
    title: string;
    activity_type: string;
    created_at: string;
    photo_url: string | null;
  }[];
  tasks_today: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  whatsapp_links: {
    chat: string;
    call: string;
  } | null;
}

// Location History Point — Phase 2D
export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  logged_at: string;
  is_within_area: boolean;
}

// Location History — Phase 2D
export interface LocationHistory {
  user_id: string;
  user_name: string;
  role: string;
  date: string;
  shift_id: string | null;
  shift_name: string | null;
  area_id: string | null;
  area_name: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  points: LocationHistoryPoint[];
  total_points: number;
  total_distance_meters: number;
  time_inside_area_minutes: number;
  time_outside_area_minutes: number;
  generated_at: string;
}

// Staffing Summary Item — Phase 2D
export interface StaffingSummaryItem {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  roles: {
    role: string;
    active: number;
    idle: number;
    outside_area: number;
    missing: number;
    offline: number;
    total_assigned: number;
    total_required: number;
  }[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

// WebSocket event types — Phase 2D
export interface UserStatusChangedEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  previous_status: TrackingStatus;
  new_status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface UserAreaEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Phase 2D: WebSocket reassigned event
export interface UserReassignedEvent {
  user_id: string;
  user_name: string;
  role: string;
  previous_area_id: string | null;
  previous_area_name: string | null;
  new_area_id: string;
  new_area_name: string;
  rayon_id: string | null;
  timestamp: string;
}

// Phase 2D: WebSocket area staffing changed event
export interface AreaStaffingChangedEvent {
  area_id: string;
  rayon_id: string | null;
  active_count: number;
  required_count: number;
  is_met: boolean;
  timestamp: string;
}

// Phase 2D: Boundary types for monitoring map
export interface RoleStaffingItem {
  role: string;
  required: number;
  active: number;
}

export interface AreaBoundary {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  boundary_polygon: GeoJsonPolygon | null;
  radius_meters: number;
  rayon_id: string;
  rayon_name: string;
  assigned_count: number;
  staffing: RoleStaffingItem[];
  is_understaffed: boolean;
  total_active: number;
  total_required: number;
}

export interface RayonBoundary {
  id: string;
  name: string;
  code: string;
  center_lat: number;
  center_lng: number;
  boundary_polygon: GeoJsonPolygon | null;
  areas: AreaBoundary[];
  area_count: number;
  is_understaffed: boolean;
  understaffed_area_count: number;
}

export interface BoundariesResponse {
  rayons: RayonBoundary[];
  generated_at: string;
}

// Phase 2D: Staffing summary response wrapper with day type
export interface StaffingSummaryResponseFull {
  items: StaffingSummaryItem[];
  current_day_type: string;
  current_day_type_label: string;
  generated_at: string;
}

// Phase 2D: Reassign worker types
export interface ReassignWorkerPayload {
  user_id: string;
  target_area_id: string;
  shift_definition_id?: string;
  effective_date?: string;
  end_current_schedule?: boolean;
  reason?: string;
}

export interface ReassignWorkerResponse {
  user_id: string;
  user_name: string;
  previous_area_id: string | null;
  previous_area_name: string | null;
  new_area_id: string;
  new_area_name: string;
  new_schedule_id: string | null;
  effective_date: string;
  reassigned_at: string;
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

// =====================
// Phase 3: Plants
// =====================

// Plant Species (Phase 3 3-7, M1-R)
export interface PlantSpecies {
  id: string;
  nameId: string;              // Indonesian name
  nameLatin: string | null;    // Scientific name
  category: 'tree' | 'shrub' | 'groundcover' | 'flower';
  defaultPruningCycleDays: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Area Plant Inventory (Phase 3 3-7)
export interface AreaPlant {
  id: string;
  areaId: string;
  speciesId: string;
  count: number;
  lastPrunedAt: string | null;
  nextDueAt: string | null;
  status: 'ok' | 'due' | 'overdue';
  overrideCycleDays: number | null;
  species: PlantSpecies;
  createdAt: string;
  updatedAt: string;
}

// Notable Plant (heritage tree, Phase 3 3-7)
export interface NotablePlant {
  id: string;
  areaId: string;
  speciesId: string;
  gpsLat: number;
  gpsLng: number;
  label: string | null;
  heritage: boolean;
  photoUrls: string[];
  notes: string | null;
  species: PlantSpecies;
  createdAt: string;
  updatedAt: string;
}

// Plant Status Classification (Phase 3 3-8: due-date forecast)
export type PlantStatus = 'ok' | 'due_soon' | 'overdue' | 'unknown';

// Area Plant Status Summary per species (Phase 3 3-8)
export interface AreaPlantStatusSummary {
  speciesId: string;
  speciesName: string;
  categoryCode: 'tree' | 'shrub' | 'groundcover' | 'flower';
  count: number;
  statusCounts: {
    ok: number;
    due_soon: number;
    overdue: number;
    unknown: number;
  };
}

// Area Plant Status Response (Phase 3 3-8)
export interface AreaPlantStatusResponse {
  areaId: string;
  areaName: string;
  totals: {
    ok: number;
    due_soon: number;
    overdue: number;
    unknown: number;
  };
  bySpecies: AreaPlantStatusSummary[];
  generatedAt: string;
}


// Plant Seed (Phase 3 3-12: seed inventory management)
export interface PlantSeed {
  id: string;
  nameId: string;                          // Seed identifier/SKU
  speciesId?: string | null;               // FK to plant_species
  unit: 'gram' | 'piece' | 'packet';       // Unit of measurement
  stockQty: number;                        // Current stock quantity
  lastCountedAt: string | null;            // Last physical count
  createdAt: string;
  updatedAt: string;
}

// Seed Transaction Type (Phase 3 3-12)
export type SeedTransactionType = 'purchase' | 'distribution' | 'adjustment';

// Seed Transaction (Phase 3 3-12: transaction ledger)
export interface SeedTransaction {
  id: string;
  seedId: string;
  transactionType: 'purchase' | 'distribution' | 'adjustment';
  qty: number;
  unitPrice?: number | null;               // For purchase/cost tracking
  supplier?: string | null;                // For purchase
  receiptUrl?: string | null;              // S3 URL to receipt
  toRayonId?: string | null;               // For distribution
  toAreaId?: string | null;                // For distribution
  recipientName?: string | null;           // For distribution
  occurredAt: string;                      // Date of transaction (YYYY-MM-DD)
  recordedBy?: string | null;              // FK to user who recorded
  notes?: string | null;
  createdAt: string;
}
