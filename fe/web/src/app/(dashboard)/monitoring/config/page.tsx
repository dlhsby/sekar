/**
 * Monitoring Configuration Page (Phase 2D - Admin Only)
 * Manage monitoring system configuration keys
 * Access: admin_system, superadmin
 */

'use client';

import { useState } from 'react';
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
import { Settings, Save, AlertCircle } from 'lucide-react';

type ConfigDraft = Record<string, string>;

function ConfigCard({
  item,
  draft,
  onDraftChange,
  onSave,
  isSaving,
}: {
  item: MonitoringConfigItem;
  draft: string;
  onDraftChange: (val: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const isModified = draft !== JSON.stringify(item.value, null, 2);
  let parseError = '';
  try {
    if (draft) JSON.parse(draft);
  } catch {
    parseError = 'Format JSON tidak valid';
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="bg-nb-gray-50 py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <code className="text-sm font-mono font-bold text-nb-black">{item.key}</code>
            <p className="text-xs text-nb-gray-500 mt-0.5">{item.description}</p>
          </div>
          {isModified && !parseError && (
            <Button
              size="sm"
              onClick={onSave}
              loading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              aria-label={`Simpan konfigurasi ${item.key}`}
            >
              Simpan
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div>
          <label
            htmlFor={`config-${item.key}`}
            className="text-xs font-bold text-nb-gray-600 mb-1.5 block"
          >
            Nilai (JSON)
          </label>
          <textarea
            id={`config-${item.key}`}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={Math.max(3, draft.split('\n').length)}
            className={cn(
              'w-full font-mono text-sm border-2 border-nb-black rounded-nb-base p-3',
              'bg-white focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1',
              'resize-y min-h-[80px]',
              parseError ? 'border-nb-danger' : ''
            )}
            aria-invalid={!!parseError}
            aria-describedby={parseError ? `config-error-${item.key}` : undefined}
            spellCheck={false}
          />
          {parseError && (
            <p
              id={`config-error-${item.key}`}
              className="mt-1 text-xs text-nb-danger flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {parseError}
            </p>
          )}
          <p className="mt-1.5 text-xs text-nb-gray-400">
            Terakhir diubah:{' '}
            {new Date(item.updated_at).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MonitoringConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, isLoading, error } = useMonitoringConfig();
  const { mutate: updateConfig, isPending } = useUpdateMonitoringConfig();

  const [drafts, setDrafts] = useState<ConfigDraft>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKeys, setSuccessKeys] = useState<Set<string>>(new Set());

  const isAdmin = user
    ? hasRole(user.role as UserRole, ADMIN_ROLES)
    : false;

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
            <h2 className="font-bold text-lg mb-2">Akses Ditolak</h2>
            <p className="text-nb-gray-600 text-sm mb-4">
              Halaman ini hanya dapat diakses oleh Admin Sistem dan Superadmin.
            </p>
            <Button onClick={() => router.push('/monitoring')}>Kembali ke Monitoring</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDraft = (item: MonitoringConfigItem): string => {
    if (item.key in drafts) return drafts[item.key];
    return JSON.stringify(item.value, null, 2);
  };

  const handleDraftChange = (key: string, val: string) => {
    setDrafts((prev) => ({ ...prev, [key]: val }));
    setSuccessKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleSave = (item: MonitoringConfigItem) => {
    const draft = getDraft(item);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(draft) as Record<string, unknown>;
    } catch {
      return;
    }

    setSavingKey(item.key);
    updateConfig(
      { key: item.key, value: parsed },
      {
        onSuccess: () => {
          setSavingKey(null);
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[item.key];
            return next;
          });
          setSuccessKeys((prev) => new Set(prev).add(item.key));
        },
        onError: () => {
          setSavingKey(null);
        },
      }
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-nb-black" />
        <div>
          <h1 className="text-2xl font-black text-nb-black">Konfigurasi Monitoring</h1>
          <p className="text-nb-gray-500 text-sm mt-0.5">
            Kelola pengaturan sistem monitoring real-time
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-nb-gray-200 border-2 border-nb-black animate-pulse rounded-nb-base" />
          ))}
        </div>
      ) : error ? (
        <Card variant="outlined" className="border-nb-danger">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-nb-danger mb-2" />
            <p className="font-semibold">Gagal memuat konfigurasi</p>
            <p className="text-sm text-nb-gray-500 mt-1">Periksa koneksi atau coba lagi</p>
          </CardContent>
        </Card>
      ) : !data || data.configs.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="p-8 text-center">
            <Settings className="w-10 h-10 mx-auto text-nb-gray-300 mb-3" />
            <p className="font-semibold text-nb-gray-600">Tidak ada konfigurasi tersedia</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.configs.map((item) => (
            <div key={item.key} className="relative">
              {successKeys.has(item.key) && (
                <div className="absolute -top-2 right-4 z-10 bg-green-400 border-2 border-nb-black text-green-900 text-xs font-bold px-3 py-1 rounded-nb-sm shadow-nb-xs">
                  Disimpan
                </div>
              )}
              <ConfigCard
                item={item}
                draft={getDraft(item)}
                onDraftChange={(val) => handleDraftChange(item.key, val)}
                onSave={() => handleSave(item)}
                isSaving={savingKey === item.key && isPending}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
