/**
 * Monitoring Configuration Page (Phase 2D - Admin Only)
 * Structured form with individual inputs, ranges, and validation
 * Access: admin_system, superadmin
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/hooks';
import {
  useMonitoringConfig,
  useUpdateMonitoringConfig,
  type MonitoringConfigItem,
} from '@/lib/api/monitoring';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import { Settings, Save, AlertCircle, Check } from 'lucide-react';

// Configuration field definition for structured rendering
interface ConfigField {
  key: string;
  label: string;
  type: 'number' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
}

interface ConfigSection {
  title: string;
  description: string;
  configKey: string;
  fields: ConfigField[];
}

function getConfigSections(t: any): ConfigSection[] {
  return [
    {
      title: t('monitoring:config.sections.statusThresholds.title'),
      description: t('monitoring:config.sections.statusThresholds.description'),
      configKey: 'status_thresholds',
      fields: [
        {
          key: 'active_max_age_seconds',
          label: t('monitoring:config.sections.statusThresholds.activeMaxAge'),
          type: 'number',
          min: 60,
          max: 600,
          step: 30,
          unit: t('monitoring:config.units.seconds'),
          description: t('monitoring:config.sections.statusThresholds.activeMaxAgeHelp'),
        },
        {
          key: 'inactive_threshold_seconds',
          label: t('monitoring:config.sections.statusThresholds.inactiveThreshold'),
          type: 'number',
          min: 300,
          max: 3600,
          step: 60,
          unit: t('monitoring:config.units.seconds'),
          description: t('monitoring:config.sections.statusThresholds.inactiveThresholdHelp'),
        },
        {
          key: 'missing_threshold_seconds',
          label: t('monitoring:config.sections.statusThresholds.missingThreshold'),
          type: 'number',
          min: 1800,
          max: 7200,
          step: 300,
          unit: t('monitoring:config.units.seconds'),
          description: t('monitoring:config.sections.statusThresholds.missingThresholdHelp'),
        },
      ],
    },
    {
      title: t('monitoring:config.sections.geofencing.title'),
      description: t('monitoring:config.sections.geofencing.description'),
      configKey: 'geofencing',
      fields: [
        {
          key: 'boundary_tolerance_meters',
          label: t('monitoring:config.sections.geofencing.boundaryTolerance'),
          type: 'number',
          min: 0,
          max: 500,
          step: 10,
          unit: t('monitoring:config.units.meters'),
          description: t('monitoring:config.sections.geofencing.boundaryToleranceHelp'),
        },
        {
          key: 'outside_area_grace_period_seconds',
          label: t('monitoring:config.sections.geofencing.gracePeriod'),
          type: 'number',
          min: 0,
          max: 600,
          step: 30,
          unit: t('monitoring:config.units.seconds'),
          description: t('monitoring:config.sections.geofencing.gracePeriodHelp'),
        },
      ],
    },
    {
      title: t('monitoring:config.sections.mapDefaults.title'),
      description: t('monitoring:config.sections.mapDefaults.description'),
      configKey: 'map_defaults',
      fields: [
        { key: 'default_zoom', label: t('monitoring:config.sections.mapDefaults.defaultZoom'), type: 'number', min: 8, max: 18, step: 1 },
        {
          key: 'cluster_threshold_zoom',
          label: t('monitoring:config.sections.mapDefaults.clusterZoom'),
          type: 'number',
          min: 8,
          max: 18,
          step: 1,
          description: t('monitoring:config.sections.mapDefaults.clusterZoomHelp'),
        },
        {
          key: 'default_center_lat',
          label: t('monitoring:config.sections.mapDefaults.centerLat'),
          type: 'number',
          min: -90,
          max: 90,
          step: 0.0001,
        },
        {
          key: 'default_center_lng',
          label: t('monitoring:config.sections.mapDefaults.centerLng'),
          type: 'number',
          min: -180,
          max: 180,
          step: 0.0001,
        },
      ],
    },
    {
      title: t('monitoring:config.sections.alertSettings.title'),
      description: t('monitoring:config.sections.alertSettings.description'),
      configKey: 'alert_settings',
      fields: [
        {
          key: 'low_battery_threshold',
          label: t('monitoring:config.sections.alertSettings.lowBatteryThreshold'),
          type: 'number',
          min: 1,
          max: 50,
          step: 1,
          unit: t('monitoring:config.units.percent'),
        },
        {
          key: 'boundary_alerts_enabled',
          label: t('monitoring:config.sections.alertSettings.boundaryAlerts'),
          type: 'toggle',
          description: t('monitoring:config.sections.alertSettings.boundaryAlertsHelp'),
        },
        {
          key: 'missing_worker_alerts_enabled',
          label: t('monitoring:config.sections.alertSettings.missingWorkerAlerts'),
          type: 'toggle',
          description: t('monitoring:config.sections.alertSettings.missingWorkerAlertsHelp'),
        },
      ],
    },
  ];
}

interface FieldInputProps {
  field: ConfigField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  error?: string;
}

function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const { t } = useTranslation();

  if (field.type === 'toggle') {
    const isOn = !!value;
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex-1 min-w-0 mr-4">
          <label className="text-sm font-bold text-nb-black">{field.label}</label>
          {field.description && (
            <p className="text-xs text-nb-gray-500 mt-0.5">{field.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(field.key, !isOn)}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full border-2 border-nb-black transition-colors',
            isOn ? 'bg-nb-primary' : 'bg-nb-gray-200'
          )}
          role="switch"
          aria-checked={isOn}
          aria-label={field.label}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white border border-nb-black transition-transform',
              isOn ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    );
  }

  const numValue = typeof value === 'number' ? value : 0;
  const isOutOfRange =
    field.min !== undefined &&
    field.max !== undefined &&
    (numValue < field.min || numValue > field.max);

  return (
    <div className="py-2">
      <label className="text-sm font-bold text-nb-black block mb-1">
        {field.label}
        {field.unit && (
          <span className="text-xs font-normal text-nb-gray-500 ml-1">({field.unit})</span>
        )}
      </label>
      {field.description && <p className="text-xs text-nb-gray-500 mb-1.5">{field.description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={numValue}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className={cn(
            'w-full px-3 py-2 text-sm border-2 border-nb-black rounded-nb-base',
            'bg-white focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1',
            'font-mono',
            (isOutOfRange || error) && 'border-nb-danger'
          )}
          aria-invalid={isOutOfRange || !!error}
        />
      </div>
      {isOutOfRange && (
        <p className="mt-1 text-xs text-nb-danger flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {t('monitoring:config.rangeValid', { min: field.min, max: field.max })}
        </p>
      )}
      {error && !isOutOfRange && (
        <p className="mt-1 text-xs text-nb-danger flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function MonitoringConfigPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, isLoading, error } = useMonitoringConfig();
  const { mutate: updateConfig, isPending } = useUpdateMonitoringConfig();
  const CONFIG_SECTIONS = getConfigSections(t);

  // Drafts: configKey -> { fieldKey: value }
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKeys, setSuccessKeys] = useState<Set<string>>(new Set());

  const isAdmin = user ? hasRole(user.role as UserRole, ADMIN_ROLES) : false;

  const getConfigValue = useCallback(
    (configKey: string): Record<string, unknown> => {
      // Find the config item from the API data
      const configItem = data?.configs.find((c) => c.key === configKey);
      const baseValue = (configItem?.value ?? {}) as Record<string, unknown>;
      const draft = drafts[configKey];
      if (!draft) return baseValue;
      return { ...baseValue, ...draft };
    },
    [data, drafts]
  );

  const handleFieldChange = useCallback((configKey: string, fieldKey: string, value: unknown) => {
    setDrafts((prev) => ({
      ...prev,
      [configKey]: {
        ...(prev[configKey] ?? {}),
        [fieldKey]: value,
      },
    }));
    setSuccessKeys((prev) => {
      const next = new Set(prev);
      next.delete(configKey);
      return next;
    });
  }, []);

  const isModified = useCallback(
    (configKey: string): boolean => {
      return !!drafts[configKey] && Object.keys(drafts[configKey]).length > 0;
    },
    [drafts]
  );

  const hasValidationErrors = useCallback(
    (section: ConfigSection): boolean => {
      const values = getConfigValue(section.configKey);
      return section.fields.some((field) => {
        if (field.type !== 'number') return false;
        const val = values[field.key];
        if (typeof val !== 'number') return false;
        if (field.min !== undefined && val < field.min) return true;
        if (field.max !== undefined && val > field.max) return true;
        return false;
      });
    },
    [getConfigValue]
  );

  const handleSave = useCallback(
    (section: ConfigSection) => {
      const values = getConfigValue(section.configKey);
      setSavingKey(section.configKey);
      updateConfig(
        { key: section.configKey, value: values },
        {
          onSuccess: () => {
            setSavingKey(null);
            setDrafts((prev) => {
              const next = { ...prev };
              delete next[section.configKey];
              return next;
            });
            setSuccessKeys((prev) => new Set(prev).add(section.configKey));
          },
          onError: () => {
            setSavingKey(null);
          },
        }
      );
    },
    [getConfigValue, updateConfig]
  );

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-nb-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card variant="outlined" className="border-nb-danger">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-nb-danger mb-3" />
            <h2 className="font-bold text-lg mb-2">{t('monitoring:config.accessDenied')}</h2>
            <p className="text-nb-gray-600 text-sm mb-4">
              {t('monitoring:config.accessDeniedMessage')}
            </p>
            <Button onClick={() => router.push('/monitoring')}>{t('monitoring:config.backButton')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-nb-black" />
        <div>
          <h1 className="text-2xl font-black text-nb-black">{t('monitoring:config.pageTitle')}</h1>
          <p className="text-nb-gray-500 text-sm mt-0.5">
            {t('monitoring:config.pageDescription')}
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-nb-gray-200 border-2 border-nb-black animate-pulse rounded-nb-base"
            />
          ))}
        </div>
      ) : error ? (
        <Card variant="outlined" className="border-nb-danger">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-nb-danger mb-2" />
            <p className="font-semibold">{t('monitoring:config.error')}</p>
            <p className="text-sm text-nb-gray-500 mt-1">{t('monitoring:config.errorHelper')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {CONFIG_SECTIONS.map((section) => {
            const sectionModified = isModified(section.configKey);
            const sectionHasErrors = hasValidationErrors(section);
            const values = getConfigValue(section.configKey);
            const isSaving = savingKey === section.configKey && isPending;
            const isSuccess = successKeys.has(section.configKey);

            return (
              <Card key={section.configKey} variant="elevated" className="overflow-hidden">
                <CardHeader className="bg-nb-gray-50 py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-black text-nb-black">{section.title}</h2>
                      <p className="text-xs text-nb-gray-500 mt-0.5">{section.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSuccess && (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-700">
                          <Check className="w-3.5 h-3.5" />
                          {t('monitoring:config.saved')}
                        </span>
                      )}
                      {sectionModified && !sectionHasErrors && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(section)}
                          loading={isSaving}
                          leftIcon={<Save className="w-3.5 h-3.5" />}
                          aria-label={t('monitoring:config.saveButton')}
                        >
                          {t('monitoring:config.saveButton')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="divide-y divide-nb-gray-100">
                    {section.fields.map((field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={values[field.key]}
                        onChange={(fieldKey, val) =>
                          handleFieldChange(section.configKey, fieldKey, val)
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
