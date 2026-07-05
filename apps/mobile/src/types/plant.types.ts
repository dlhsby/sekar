/**
 * Plants, plant inventory and seed management (Phase 3).
 */

// Plant Species (Phase 3 3-7, M1-R)
export interface PlantSpecies {
  id: string;
  nameId: string; // Indonesian name
  nameLatin: string | null; // Scientific name
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
  nameId: string; // Seed identifier/SKU
  speciesId?: string | null; // FK to plant_species
  unit: 'gram' | 'piece' | 'packet'; // Unit of measurement
  stockQty: number; // Current stock quantity
  lastCountedAt: string | null; // Last physical count
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
  unitPrice?: number | null; // For purchase/cost tracking
  supplier?: string | null; // For purchase
  receiptUrl?: string | null; // S3 URL to receipt
  toRayonId?: string | null; // For distribution
  toAreaId?: string | null; // For distribution
  recipientName?: string | null; // For distribution
  occurredAt: string; // Date of transaction (YYYY-MM-DD)
  recordedBy?: string | null; // FK to user who recorded
  notes?: string | null;
  createdAt: string;
}
