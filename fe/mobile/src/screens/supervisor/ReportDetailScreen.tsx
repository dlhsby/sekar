/**
 * Report Detail Screen
 * Shows full details of a work report with photos and location
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { formatDateTime } from '../../utils/dateUtils';
import { getReportDetails } from '../../services/api/supervisorApi';
import PhotoGallery from '../../components/supervisor/PhotoGallery';
import Card from '../../components/common/Card';
import ErrorBanner from '../../components/common/ErrorBanner';
import type { WorkReport } from '../../types/models.types';

// Report types mapping
const REPORT_TYPE_LABELS: Record<string, string> = {
  task_completion: 'Penyelesaian Tugas',
  incident: 'Insiden',
  maintenance_request: 'Permintaan Pemeliharaan',
};

interface ReportDetailScreenProps {
  route: {
    params: {
      reportId: number;
    };
  };
  navigation: any;
}

/**
 * Report Detail Screen
 * Full view of report with all details, photos, and location
 */
function ReportDetailScreen({ route, navigation }: ReportDetailScreenProps): JSX.Element {
  const { reportId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WorkReport | null>(null);

  useEffect(() => {
    loadReportDetails();
  }, [reportId]);

  const loadReportDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getReportDetails(reportId);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setReport(response.data);
      }
    } catch (err) {
      setError('Gagal memuat detail laporan');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMaps = () => {
    if (!report) {return;}

    const latitude = report.gps_lat;
    const longitude = report.gps_lng;
    const label = 'Lokasi Laporan';

    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        setError('Tidak dapat membuka aplikasi peta');
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat detail laporan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorBanner message={error} onRetry={loadReportDetails} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Laporan tidak ditemukan</Text>
      </View>
    );
  }

  const reportTypeLabel = REPORT_TYPE_LABELS[report.condition || 'task_completion'] || 'Laporan';
  const photoUrls = report.media?.map((m) => m.media_url) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Pekerja:</Text>
          <Text style={styles.value}>{report.worker?.full_name || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Area:</Text>
          <Text style={styles.value}>{report.area?.name || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Jenis:</Text>
          <Text style={styles.value}>{reportTypeLabel}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Waktu:</Text>
          <Text style={styles.value}>{formatDateTime(report.report_time)}</Text>
        </View>

        {report.condition && (
          <View style={styles.row}>
            <Text style={styles.label}>Kondisi:</Text>
            <Text style={styles.value}>{report.condition}</Text>
          </View>
        )}

        {report.reviewed && (
          <View style={styles.reviewedRow}>
            <Text style={styles.reviewedText}>✓ Sudah Ditinjau</Text>
            {report.reviewed_at && (
              <Text style={styles.reviewedTime}>
                {formatDateTime(report.reviewed_at)}
              </Text>
            )}
          </View>
        )}
      </Card>

      {/* Description Card */}
      {report.notes && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.description}>{report.notes}</Text>
        </Card>
      )}

      {/* Photos Card */}
      {photoUrls.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            Foto ({photoUrls.length})
          </Text>
          <Text style={styles.hint}>Ketuk foto untuk memperbesar</Text>
          <PhotoGallery photos={photoUrls} testID="report-detail-gallery" />
        </Card>
      )}

      {/* Location Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Lokasi</Text>
        <View style={styles.locationRow}>
          <Text style={styles.coordinates}>
            📍 {report.gps_lat.toFixed(6)}, {report.gps_lng.toFixed(6)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.mapsButton}
          onPress={handleOpenMaps}
          testID="open-maps-button">
          <Text style={styles.mapsButtonText}>Buka di Peta</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    paddingVertical: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error,
  },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    width: 80,
    fontWeight: typography.fontWeight.medium,
  },
  value: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: typography.fontWeight.regular,
  },
  reviewedRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewedText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
  },
  reviewedTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textHint,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  locationRow: {
    marginBottom: spacing.sm,
  },
  coordinates: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mapsButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  mapsButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ReportDetailScreen;
