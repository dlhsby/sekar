/**
 * Activity Detail Page (Phase 2C - with approval workflow)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useActivity, useApproveActivity, useRejectActivity } from '@/lib/api/activities';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent, Badge, Button, FormInput } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import { MONITORING_ROLES, ACTIVITY_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { getActivityStatusLabels, ACTIVITY_STATUS_BADGES } from '@/lib/constants/activities';
import { runAction } from '@/lib/hooks/use-action';

interface ActivityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { t } = useTranslation(['activities', 'common']);
  const activityLabels = getActivityStatusLabels();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { id: activityId } = use(params);

  const approveMutation = useApproveActivity();
  const rejectMutation = useRejectActivity();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: activity, isLoading } = useActivity(activityId);

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

  if (!activity) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-nb-gray-600 font-semibold">{t('activities:notFound')}</p>
        </div>
      </div>
    );
  }

  const canApprove = hasRole(user.role, ACTIVITY_APPROVER_ROLES) && activity.status === 'pending';

  const handleApprove = async () => {
    await runAction(() => approveMutation.mutateAsync(activityId), {
      success: t('common:messages.approved'),
    });
    router.push('/activities');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await runAction(() => rejectMutation.mutateAsync({ id: activityId, reason: rejectReason }), {
      success: t('common:messages.rejected'),
    });
    router.push('/activities');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/activities" className="text-nb-primary hover:underline font-semibold">
              {t('activities:detail.breadcrumb')}
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
          onClick={() => router.push('/activities')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {t('activities:detail.backButton')}
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">{t('activities:detail.title')}</h1>
          <div className="flex gap-2">
            <Badge variant="default" size="lg">
              {activity.activity_type?.name || 'Unknown'}
            </Badge>
            <Badge variant={ACTIVITY_STATUS_BADGES[activity.status]} size="lg">
              {activityLabels[activity.status]}
            </Badge>
          </div>
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
              <h3 className="font-bold text-nb-black">{t('activities:detail.actions.rejectDialog')}</h3>
              <FormInput
                label={t('activities:detail.actions.reasonLabel')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('activities:detail.actions.reasonPlaceholder')}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  loading={rejectMutation.isPending}
                >
                  {t('activities:detail.actions.rejectButton')}
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
            <h2 className="text-xl font-bold text-nb-black">{t('activities:detail.sections.information')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.user')}</div>
                <div className="font-bold text-nb-black">{activity.user?.full_name}</div>
                <div className="text-sm text-nb-gray-600">{activity.user?.username}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.area')}</div>
                <div className="font-bold text-nb-black">{activity.area?.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.activityType')}</div>
                <div className="font-bold text-nb-black">{activity.activity_type?.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.dateTime')}</div>
                <div className="font-bold text-nb-black">
                  {new Date(activity.created_at).toLocaleString(intlLocale())}
                </div>
              </div>
              {(activity.gps_lat || activity.gps_lng) && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.gpsLocation')}</div>
                  <div className="font-mono text-sm">
                    {activity.gps_lat}, {activity.gps_lng}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approval Info */}
        {activity.status !== 'pending' && (
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-xl font-bold text-nb-black">
                {activity.status === 'approved'
                  ? t('activities:detail.sections.approval')
                  : t('activities:detail.sections.rejection')}
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity.reviewer && (
                  <div>
                    <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.processedBy')}</div>
                    <div className="font-bold text-nb-black">{activity.reviewer.full_name}</div>
                  </div>
                )}
                {activity.reviewed_at && (
                  <div>
                    <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.processDate')}</div>
                    <div className="font-bold text-nb-black">
                      {new Date(activity.reviewed_at).toLocaleString(intlLocale())}
                    </div>
                  </div>
                )}
                {activity.rejection_reason && (
                  <div>
                    <div className="text-sm font-semibold text-nb-gray-600">{t('activities:detail.fields.rejectionReason')}</div>
                    <div className="text-nb-gray-700">{activity.rejection_reason}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activity.photo_urls && activity.photo_urls.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-xl font-bold text-nb-black">
                {t('activities:detail.sections.photos')} ({activity.photo_urls.length})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {activity.photo_urls.map((url, index) => (
                  <div
                    key={index}
                    className="bg-nb-gray-100 border-2 border-nb-black overflow-hidden"
                  >
                    <img src={url} alt={`${t('activities:detail.sections.photos')} ${index + 1}`} className="w-full h-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">{t('activities:detail.sections.description')}</h2>
        </CardHeader>
        <CardContent>
          <p className="text-nb-gray-700">{activity.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
