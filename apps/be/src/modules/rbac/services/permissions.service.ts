import { Injectable } from '@nestjs/common';
import {
  PERMISSION_CATALOG,
  flattenCatalog,
  CatalogPermission,
} from '../catalog/permission-catalog';

export interface PermissionCatalogAction {
  key: string;
  action: string;
  label: string;
  description: string;
}
export interface PermissionCatalogResource {
  resource: string;
  label: string;
  actions: PermissionCatalogAction[];
}
export interface PermissionCatalogCategory {
  category: string;
  label: string;
  resources: PermissionCatalogResource[];
}

/**
 * Serves the permission catalog to the role-management UI (ADR-044). The grouping
 * (Category → Resource → action) is code-side, not a DB column, so the web
 * accordion and the backend agree on one taxonomy.
 */
@Injectable()
export class PermissionsService {
  /** Grouped catalog for the accordion (concrete keys only; no wildcards). */
  getCatalog(): PermissionCatalogCategory[] {
    const byKey = new Map<string, CatalogPermission>(flattenCatalog().map((p) => [p.key, p]));
    return PERMISSION_CATALOG.map((cat) => ({
      category: cat.category,
      label: cat.label,
      resources: cat.resources.map((res) => ({
        resource: res.resource,
        label: res.label,
        actions: res.actions.map((act) => {
          const key = `${res.resource}:${act.action}`;
          return {
            key,
            action: act.action,
            label: act.label,
            description: byKey.get(key)?.description ?? '',
          };
        }),
      })),
    }));
  }

  /** Flat list of every concrete permission key. */
  getKeys(): string[] {
    return flattenCatalog().map((p) => p.key);
  }
}
