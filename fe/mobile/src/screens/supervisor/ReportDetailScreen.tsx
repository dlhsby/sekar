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
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { NBButton, NBCard, NBBackgroundPattern, NBBadge } from '../../components/nb';
import { formatDateTime } from '../../utils/dateUtils';
import { getReportDetails } from '../../services/api/supervisorApi';
import PhotoGallery from '../../components/supervisor/PhotoGallery';
import { NBAlert } from '../../components/nb';
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

  // Set up header with back button to Reports List
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('TasksReports')}
          style={styles.backButton}
          accessibilityLabel="Kembali ke Daftar Laporan"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={24} color={nbColors.black} />
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
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat detail laporan...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (error) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <NBAlert
            variant="danger"
            title="Gagal Memuat Laporan"
            message={error}
            actionLabel="Coba Lagi"
            onAction={loadReportDetails}
            testID="report-detail-error"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!report) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Laporan tidak ditemukan</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  // Support both report_type (backend) and condition (legacy/tests) fields for type label
  const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type || report.condition || 'task_completion'] || 'Laporan';
  // Support both backend formats: single photo_url or media array
  const photoUrls = report.media?.map((m) => m.media_url) ||
    (report.photo_url ? [report.photo_url] : []);

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>📋 INFORMASI LAPORAN</Text>

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

          {(report.reviewed || report.is_reviewed) && (
            <View style={styles.reviewedRow}>
              <NBBadge text="✓ Sudah Ditinjau" color="success" />
              {report.reviewed_at && (
                <Text style={styles.reviewedTime}>
                  {formatDateTime(report.reviewed_at)}
                </Text>
              )}
            </View>
          )}
        </NBCard>

      {/* Description Card - support both 'notes' and 'description' fields */}
      {(report.notes || report.description) && (
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>📝 DESKRIPSI</Text>
          <Text style={styles.description}>{report.notes || report.description}</Text>
        </NBCard>
      )}

      {/* Photos Card */}
      {photoUrls.length > 0 && (
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>
            📸 FOTO LAPORAN ({photoUrls.length})
          </Text>
          <Text style={styles.hint}>Ketuk foto untuk memperbesar</Text>
          <PhotoGallery photos={photoUrls} testID="report-detail-gallery" />
        </NBCard>
      )}

      {/* Location Card */}
      <NBCard variant="elevated" style={styles.card}>
        <Text style={styles.cardTitle}>📍 LOKASI GPS</Text>
        {report.gps_lat != null && report.gps_lng != null ? (
          <>
            <View style={styles.locationRow}>
              <Text style={styles.coordinates}>
                📍 {Number(report.gps_lat).toFixed(6)}, {Number(report.gps_lng).toFixed(6)}
              </Text>
            </View>
            <NBButton
              title={showInAppMap ? 'Sembunyikan Peta' : 'Lihat di Peta'}
              onPress={handleOpenMaps}
              variant="secondary"
              fullWidth
              style={styles.mapsButton}
              testID="open-maps-button"
            />

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
                    <Icon name="close" size={24} color={nbColors.black} />
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
      </NBCard>
    </ScrollView>
  </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingVertical: nbSpacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.danger,
  },
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    padding: 12, // Compact padding for consistency
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: nbSpacing.sm,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    width: 80,
    fontWeight: nbTypography.fontWeight.medium,
  },
  value: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.black,
    flex: 1,
    fontWeight: nbTypography.fontWeight.regular,
  },
  reviewedRow: {
    marginTop: nbSpacing.sm,
    paddingTop: nbSpacing.sm,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.black,
  },
  reviewedTime: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[600],
    marginTop: 4,
  },
  hint: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[400],
    marginBottom: nbSpacing.sm,
  },
  description: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.black,
    lineHeight: nbTypography.fontSize.sm * nbTypography.lineHeight.normal,
  },
  locationRow: {
    marginBottom: nbSpacing.sm,
  },
  coordinates: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noLocationText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    fontStyle: 'italic',
  },
  mapsButton: {
    marginTop: nbSpacing.sm,
  },
  mapsButtonText: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  backButton: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  inAppMapContainer: {
    marginTop: nbSpacing.md,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    backgroundColor: nbColors.gray[100],
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.black,
  },
  mapTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  closeMapButton: {
    padding: nbSpacing.xs,
  },
  map: {
    width: '100%',
    height: 250,
  },
});

export default ReportDetailScreen;
