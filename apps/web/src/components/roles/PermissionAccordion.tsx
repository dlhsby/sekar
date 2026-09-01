'use client';

import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Checkbox,
  Badge,
} from '@/components/ui';
import type { PermissionCatalogCategory } from '@/lib/api/roles';

interface PermissionAccordionProps {
  catalog: PermissionCatalogCategory[];
  /** Concrete permission keys currently checked. */
  checked: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  onToggleMany: (keys: string[], on: boolean) => void;
  disabled?: boolean;
}

/** 3-level Category → Resource → action permission editor (ADR-044). */
export function PermissionAccordion({
  catalog,
  checked,
  onToggle,
  onToggleMany,
  disabled,
}: PermissionAccordionProps) {
  const { t } = useTranslation();
  const countChecked = (keys: string[]) => keys.filter((k) => checked.has(k)).length;

  return (
    <Accordion type="multiple" className="space-y-3">
      {catalog.map((cat) => {
        const catKeys = cat.resources.flatMap((r) => r.actions.map((a) => a.key));
        const catChecked = countChecked(catKeys);
        return (
          <AccordionItem key={cat.category} value={cat.category}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {cat.label}
                <Badge variant={catChecked > 0 ? 'success' : 'secondary'} size="sm">
                  {t('access-control:permissions.selectedOfTotal', {
                    selected: catChecked,
                    total: catKeys.length,
                  })}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {cat.resources.map((res) => {
                const resKeys = res.actions.map((a) => a.key);
                const resChecked = countChecked(resKeys);
                const all = resChecked === resKeys.length;
                const some = resChecked > 0 && !all;
                return (
                  <div key={res.resource} className="space-y-2">
                    <div className="flex items-center gap-2 border-b-2 border-nb-gray-200 pb-1.5">
                      <Checkbox
                        checked={all}
                        indeterminate={some}
                        disabled={disabled}
                        onChange={(e) => onToggleMany(resKeys, e.target.checked)}
                        aria-label={res.label}
                      />
                      <span className="font-semibold text-nb-black">{res.label}</span>
                      <Badge variant="secondary" size="sm">
                        {t('access-control:permissions.selectedOfTotal', {
                          selected: resChecked,
                          total: resKeys.length,
                        })}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2 lg:grid-cols-3">
                      {res.actions.map((act) => (
                        <Checkbox
                          key={act.key}
                          checked={checked.has(act.key)}
                          disabled={disabled}
                          onChange={(e) => onToggle(act.key, e.target.checked)}
                          label={
                            <span className="flex flex-col">
                              <span>{act.label}</span>
                              <span className="font-mono text-[11px] text-nb-gray-600">
                                {act.key}
                              </span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
