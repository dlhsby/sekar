/**
 * Asset Management Types
 * Phase 5-3: Asset browsing, scanning, checkout/return
 */

import type { User, Area, Rayon } from './user.types';

export type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired' | 'lost';
export type AssetCondition = 'good' | 'fair' | 'poor' | 'damaged' | 'unusable';

export interface AssetCategory {
  id: string;
  name: string;
  slug: string;
  code_prefix: string;
  description?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  category_id: string;
  category: AssetCategory;
  location_id?: string | null;
  area?: Area | null;
  rayon_id?: string | null;
  rayon?: Rayon | null;
  name: string;
  asset_code: string;
  description?: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  purchase_date?: string | null;
  purchase_price?: number | null;
  qr_code_url?: string | null;
  photo_url?: string | null;
  last_maintenance_at?: Date | null;
  next_maintenance_at?: Date | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  assignments?: AssetAssignment[];
  maintenances?: AssetMaintenance[];
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  asset?: Asset;
  assigned_to: string;
  assignedTo?: User;
  assigned_by: string;
  assignedBy?: User;
  checked_out_at: string;
  expected_return_at?: string | null;
  returned_at?: string | null;
  returned_to?: string | null;
  returnedTo?: User | null;
  condition_at_checkout: AssetCondition;
  condition_at_return?: AssetCondition | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  asset?: Asset;
  maintenance_type: string;
  status: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedAssetsResponse {
  data: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
