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
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { formatDateTime } from '../../utils/dateUtils';
import { getReportDetails } from '../../services/api/supervisorApi';
import PhotoGallery from '../../components/supervisor/PhotoGallery';
import Card from '../../components/common/Card';
import ErrorBanner from '../../components/common/ErrorBanner';
import type { WorkReport } from '../../types/models.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Report types mapping
const REPORT_TYPE_LABELS: Record<string, string> = {
  task_completion: 'Penyelesaian Tugas',
  incident: 'Insiden',
  maintenance_request: 'Permintaan Pemeliharaan',
};

interface ReportDetailScreenProps {
  route: {
    params: {
      reportId: string;
      isWorkerView?: boolean; // If true, show in-app map instead of opening external app
    };
  };
  navigation: any;
}

/**
 * Report Detail Screen
 * Full view of report with all details, photos, and location
 */
function ReportDetailScreen({ route, navigation }: ReportDetailScreenProps): JSX.Element {
  const { reportId, isWorkerView = false } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WorkReport | null>(null);
  const [showInAppMap, setShowInAppMap] = useState(false);

  useEffect(() => {
    loadReportDetails();
  }, [reportId]);

  // Set up header with back button
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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
    if (!report || report.gps_lat == null || report.gps_lng == null) {
      setError('Data lokasi GPS tidak tersedia');
      return;
    }

    // Toggle in-app map view
    setShowInAppMap(!showInAppMap);
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
          <Text style={styles.value}>{formatDateTime(report.created_at)}</Text>
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
        {report.gps_lat != null && report.gps_lng != null ? (
          <>
            <View style={styles.locationRow}>
              <Text style={styles.coordinates}>
                📍 {Number(report.gps_lat).toFixed(6)}, {Number(report.gps_lng).toFixed(6)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapsButton}
              onPress={handleOpenMaps}
              testID="open-maps-button">
              <Text style={styles.mapsButtonText}>
                {showInAppMap ? 'Sembunyikan Peta' : 'Lihat di Peta'}
              </Text>
            </TouchableOpacity>

            {/* In-App Map View */}
            {showInAppMap && (
              <View style={styles.inAppMapContainer}>
                <View style={styles.mapHeader}>
                  <Text style={styles.mapTitle}>Lokasi Laporan</Text>
                  <TouchableOpacity
                    onPress={() => setShowInAppMap(false)}
                    style={styles.closeMapButton}
                    accessibilityLabel="Tutup peta"
                    accessibilityRole="button"
                    testID="close-map-button"
                  >
                    <Icon name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: Number(report.gps_lat),
                    longitude: Number(report.gps_lng),
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  testID="report-location-map"
                >
                  <Marker
                    coordinate={{
                      latitude: Number(report.gps_lat),
                      longitude: Number(report.gps_lng),
                    }}
                    title="Lokasi Laporan"
                    description={report.area?.name || 'Lokasi pengambilan laporan'}
                  />
                </MapView>
              </View>
            )}
          </>
        ) : (
          <View style={styles.locationRow}>
            <Text style={styles.noLocationText}>
              📍 Data lokasi GPS tidak tersedia
            </Text>
          </View>
        )}
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
  noLocationText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inAppMapContainer: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  closeMapButton: {
    padding: spacing.xs,
  },
  map: {
    width: '100%',
    height: 250,
  },
});

export default ReportDetailScreen;
