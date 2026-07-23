/**
 * Overtime Detail Page (Phase 2C)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useOvertime, useApproveOvertime, useRejectOvertime } from '@/lib/api/overtime';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent, Badge, Button, FormInput } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import { MONITORING_ROLES, OVERTIME_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { getOvertimeStatusLabels, OVERTIME_STATUS_BADGES } from '@/lib/constants/overtime';
import { runAction } from '@/lib/hooks/use-action';

interface OvertimeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OvertimeDetailPage({ params }: OvertimeDetailPageProps) {
  const { t } = useTranslation(['overtime', 'common']);
  const overtimeLabels = getOvertimeStatusLabels();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { id: overtimeId } = use(params);

  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: overtime, isLoading } = useOvertime(overtimeId);

  if (authLoading || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role, MONITORING_ROLES)) return null;

  if (!overtime) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-nb-gray-600 font-semibold">{t('overtime:notFound')}</p>
        </div>
      </div>
    );
  }

  const canApprove = hasRole(user.role, OVERTIME_APPROVER_ROLES) && overtime.status === 'pending';

  const handleApprove = async () => {
    await runAction(() => approveMutation.mutateAsync(overtimeId), {
      success: t('common:messages.approved'),
    });
    router.push('/overtime');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await runAction(() => rejectMutation.mutateAsync({ id: overtimeId, reason: rejectReason }), {
      success: t('common:messages.rejected'),
    });
    router.push('/overtime');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/overtime" className="text-nb-primary hover:underline font-semibold">
              {t('overtime:detail.breadcrumb')}
            </Link>
          </li>
          <li className="text-nb-gray-400">/</li>
          <li className="text-nb-gray-600">{t('common:actions.detail')}</li>
        </ol>
      </nav>

      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/overtime')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {t('overtime:detail.backButton')}
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">{t('overtime:detail.title')}</h1>
          <Badge variant={OVERTIME_STATUS_BADGES[overtime.status]} size="lg">
            {overtimeLabels[overtime.status]}
          </Badge>
        </div>
        {canApprove && (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={handleApprove}
              loading={approveMutation.isPending}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {t('common:actions.approve')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectForm(true)}
              leftIcon={<X className="w-4 h-4" />}
            >
              {t('common:actions.reject')}
            </Button>
          </div>
        )}
      </div>

      {/* Reject Form */}
      {showRejectForm && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">{t('overtime:detail.actions.rejectDialog')}</h3>
              <FormInput
                label={t('overtime:detail.actions.reasonLabel')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('overtime:detail.actions.reasonPlaceholder')}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  loading={rejectMutation.isPending}
                >
                  {t('overtime:detail.actions.rejectButton')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                >
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('overtime:detail.sections.information')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.user')}</div>
                <div className="font-bold text-nb-black">{overtime.user?.full_name}</div>
                <div className="text-sm text-nb-gray-600">{overtime.user?.username}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.date')}</div>
                <div className="font-bold text-nb-black">
                  {new Date(overtime.start_datetime).toLocaleDateString(intlLocale())}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.time')}</div>
                <div className="font-bold text-nb-black font-mono">
                  {new Date(overtime.start_datetime).toLocaleTimeString(intlLocale(), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {new Date(overtime.end_datetime).toLocaleTimeString(intlLocale(), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.area')}</div>
                <div className="font-bold text-nb-black">{overtime.area?.name || '-'}</div>
              </div>
              {overtime.activity_type && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.activityType')}</div>
                  <div className="font-bold text-nb-black">{overtime.activity_type.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approval Info */}
        {overtime.status !== 'pending' && (
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-xl font-bold text-nb-black">
                {overtime.status === 'approved'
                  ? t('overtime:detail.sections.approval')
                  : t('overtime:detail.sections.rejection')}
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overtime.approver && (
                  <div>
                    <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.processedBy')}</div>
                    <div className="font-bold text-nb-black">{overtime.approver.full_name}</div>
                  </div>
                )}
                {overtime.approved_at && (
                  <div>
                    <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.processDate')}</div>
                    <div className="font-bold text-nb-black">
                      {new Date(overtime.approved_at).toLocaleString(intlLocale())}
                    </div>
                  </div>
                )}
                {overtime.rejection_reason && (
                  <div>
                    <div className="text-sm font-semibold text-nb-gray-600">{t('overtime:detail.fields.rejectionReason')}</div>
                    <div className="text-nb-gray-700">{overtime.rejection_reason}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description & Photos */}
      {overtime.description && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('overtime:detail.sections.description')}</h2>
          </CardHeader>
          <CardContent>
            <p className="text-nb-gray-700">{overtime.description}</p>
          </CardContent>
        </Card>
      )}

      {overtime.photo_urls && overtime.photo_urls.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">
              {t('overtime:detail.sections.photos')} ({overtime.photo_urls.length})
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {overtime.photo_urls.map((url, index) => (
                <div
                  key={index}
                  className="bg-nb-gray-100 border-2 border-nb-black overflow-hidden"
                >
                  <img src={url} alt={`${t('overtime:detail.sections.photos')} ${index + 1}`} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
