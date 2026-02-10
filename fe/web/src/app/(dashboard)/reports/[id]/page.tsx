/**
 * Report Detail Page
 * View detailed report with photo and review option
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useReport, useReviewReport } from '@/lib/api/reports';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface ReportDetailPageProps {
  params: {
    id: string;
  };
}

// Access control
const ALLOWED_ROLES = ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'];

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role)) {
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
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!ALLOWED_ROLES.includes(user.role)) {
    return null;
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-nb-gray-600 font-semibold">Laporan tidak ditemukan</p>
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
          <li className="text-nb-gray-400">/</li>
          <li className="text-nb-gray-600">Detail</li>
        </ol>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/reports')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Laporan
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">Detail Laporan</h1>
          <div className="flex items-center gap-2">
            <Badge variant={report.is_reviewed ? 'success' : 'secondary'} size="lg">
              {report.is_reviewed ? 'Ditinjau' : 'Belum Ditinjau'}
            </Badge>
          </div>
        </div>
        {!report.is_reviewed && (
          <Button
            onClick={handleReview}
            loading={reviewing}
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            Tandai Sudah Ditinjau
          </Button>
        )}
      </div>

      {/* Report Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Informasi Laporan</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Pekerja</div>
                <div className="font-bold text-nb-black">{report.worker.full_name}</div>
                <div className="text-sm text-nb-gray-600">{report.worker.username}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Area</div>
                <div className="font-bold text-nb-black">{report.area.name}</div>
                <div className="text-sm text-nb-gray-600">{report.area.areaType.name}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Tanggal & Waktu</div>
                <div className="font-bold text-nb-black">
                  {new Date(report.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Lokasi GPS</div>
                <div className="font-mono text-sm">
                  {report.gps_lat}, {report.gps_lng}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo */}
        {report.photo_url && (
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-xl font-bold text-nb-black">Foto Laporan</h2>
            </CardHeader>
            <CardContent>
              <div className="bg-nb-gray-100 border-2 border-nb-black overflow-hidden">
                <img src={report.photo_url} alt="Report Photo" className="w-full h-auto" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Deskripsi</h2>
        </CardHeader>
        <CardContent>
          <p className="text-nb-gray-700">{report.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
