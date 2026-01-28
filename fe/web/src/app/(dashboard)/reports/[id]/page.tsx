/**
 * Report Detail Page
 * View detailed report with photo and review option
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useReport, useReviewReport } from '@/lib/api/reports';
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBButton } from '@/components/nb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReportDetailPageProps {
  params: {
    id: string;
  };
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  // Access control
  const allowedRoles = ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'];

  useEffect(() => {
    if (!authLoading && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data: report, isLoading } = useReport(params.id);
  const reviewMutation = useReviewReport();

  // Loading state
  if (authLoading || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 font-semibold">Laporan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const handleReview = async () => {
    setReviewing(true);
    try {
      await reviewMutation.mutateAsync(params.id);
      router.push('/reports');
    } catch (error) {
      console.error('Failed to review report:', error);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/reports" className="text-nb-primary hover:underline font-semibold">
              Laporan
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">Detail</li>
        </ol>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/reports"
          className="inline-flex items-center text-nb-primary font-semibold hover:underline"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Daftar Laporan
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">Detail Laporan</h1>
          <div className="flex items-center gap-2">
            <NBBadge variant={report.is_reviewed ? 'success' : 'neutral'} size="lg">
              {report.is_reviewed ? 'Ditinjau' : 'Belum Ditinjau'}
            </NBBadge>
          </div>
        </div>
        {!report.is_reviewed && (
          <NBButton onClick={handleReview} variant="primary" loading={reviewing}>
            Tandai Sudah Ditinjau
          </NBButton>
        )}
      </div>

      {/* Report Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <NBCard variant="elevated">
          <NBCardHeader>
            <h2 className="text-xl font-bold text-nb-black">Informasi Laporan</h2>
          </NBCardHeader>
          <NBCardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-600">Pekerja</div>
                <div className="font-bold text-nb-black">{report.worker.full_name}</div>
                <div className="text-sm text-gray-600">{report.worker.username}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Area</div>
                <div className="font-bold text-nb-black">{report.area.name}</div>
                <div className="text-sm text-gray-600">{report.area.areaType.name}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Tanggal & Waktu</div>
                <div className="font-bold text-nb-black">
                  {new Date(report.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Lokasi GPS</div>
                <div className="font-mono text-sm">
                  {report.gps_lat}, {report.gps_lng}
                </div>
              </div>
            </div>
          </NBCardContent>
        </NBCard>

        {/* Photo */}
        {report.photo_url && (
          <NBCard variant="elevated">
            <NBCardHeader>
              <h2 className="text-xl font-bold text-nb-black">Foto Laporan</h2>
            </NBCardHeader>
            <NBCardContent>
              <div className="bg-gray-100 border-3 border-black rounded-lg overflow-hidden">
                <img
                  src={report.photo_url}
                  alt="Report Photo"
                  className="w-full h-auto"
                />
              </div>
            </NBCardContent>
          </NBCard>
        )}
      </div>

      {/* Description */}
      <NBCard variant="elevated">
        <NBCardHeader>
          <h2 className="text-xl font-bold text-nb-black">Deskripsi</h2>
        </NBCardHeader>
        <NBCardContent>
          <p className="text-gray-700">{report.description}</p>
        </NBCardContent>
      </NBCard>
    </div>
  );
}
