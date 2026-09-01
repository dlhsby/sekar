'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';

interface SettingsHeaderActionsProps {
  /** Whether there are staged, unsaved changes for this panel. */
  dirty: boolean;
  saving?: boolean;
  onReset: () => void;
  onSave: () => void;
}

/**
 * Reset + Save buttons rendered in a settings panel's header (SectionCard
 * `action`). Shared by the Personal + System tabs so both save the same way.
 */
export function SettingsHeaderActions({
  dirty,
  saving = false,
  onReset,
  onSave,
}: SettingsHeaderActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={onReset} disabled={!dirty || saving}>
        {t('settings:actionBar.reset')}
      </Button>
      <Button size="sm" onClick={onSave} loading={saving} disabled={!dirty}>
        {t('settings:actionBar.save')}
      </Button>
    </div>
  );
}
