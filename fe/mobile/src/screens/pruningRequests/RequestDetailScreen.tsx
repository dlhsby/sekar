/**
 * Pruning Request Detail Screen
 * Phase 3 sub-phase 3-10: Read-only view of submitted request
 * Shows all submitted data, photos, review notes, status, and task conversion link
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPruningRequestById } from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import { NBCard, NBBadge, NBButton, NBAlert } from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { nbColors, nbSpacing, nbBorderRadius } from '../../constants/nbTokens';
import type { PruningRequestStatus } from '../../types/models.types';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

/**
 * Type-safe navigation prop
 */
type DetailScreenProps = NativeStackScreenProps<any, 'PruningDetail'>;

/**
 * Map status to NB variant + label
 */
const getStatusDisplay = (status: PruningRequestStatus) => {
  const statusMap: Record<PruningRequestStatus, { variant: 'default' | 'primary' | 'success' | 'warning' | 'error'; label: string }> = {
    'submitted': { variant: 'warning', label: 'Menunggu' },
    'under_review': { variant: 'warning', label: 'Direview' },
    'approved': { variant: 'success', label: 'Disetujui' },
    'rejected': { variant: 'error', label: 'Ditolak' },
    'converted': { variant: 'primary', label: 'Dikonversi' },
    'in_progress': { variant: 'primary', label: 'Diproses' },
    'done': { variant: 'success', label: 'Selesai' },
    'cancelled': { variant: 'error', label: 'Dibatalkan' },
  };
  return statusMap[status] || { variant: 'default', label: status };
};

/**
 * Photo viewer modal
 */
function PhotoModal({
  visible,
  photoUrl,
  onClose,
}: {
  visible: boolean;
  photoUrl: string | null;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.photoModalBg}>
        <TouchableOpacity
          style={styles.photoModalClose}
          onPress={onClose}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Tutup foto"
        >
          <MaterialCommunityIcons
            name="close"
            size={32}
            color={nbColors.bgDefault}
          />
        </TouchableOpacity>

        {photoUrl && (
          <Image
            source={{ uri: photoUrl }}
            style={styles.photoLarge}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );
}

/**
 * Pruning Request Detail Screen
 */
export function RequestDetailScreen(props: DetailScreenProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { requestId } = props.route.params;

  const { byId, isLoading, error } = useAppSelector((state) => state.pruningRequests);
  const request = byId[requestId] || null;

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Load request on mount if not in Redux
  useEffect(() => {
    if (!request && requestId) {
      dispatch(fetchPruningRequestById(requestId));
    }
  }, [requestId, request, dispatch]);

  const handlePhotoPress = useCallback((photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setPhotoModalVisible(true);
  }, []);

  const handleViewTask = useCallback(() => {
    if (request?.convertedTaskId) {
      // Navigate to task detail (implementation depends on task navigation structure)
      // This is a placeholder for the actual navigation
      navigation.navigate('TaskDetail', { taskId: request.convertedTaskId });
    }
  }, [request?.convertedTaskId, navigation]);

  if (isLoading && !request) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <NBAlert
          type="error"
          title="Permohonan tidak ditemukan"
          message="Permohonan yang Anda cari tidak tersedia"
        />
      </View>
    );
  }

  const statusDisplay = getStatusDisplay(request.status);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Header Section */}
        <NBCard style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <NBText variant="h2">{request.referenceCode}</NBText>
              <NBText
                variant="body-sm"
                style={{ color: nbColors.textTertiary, marginTop: nbSpacing[1] }}
              >
                {formatDateTime(request.createdAt)}
              </NBText>
            </View>
            <NBBadge variant={statusDisplay.variant} label={statusDisplay.label} />
          </View>
        </NBCard>

        {/* Location Section */}
        <NBCard style={styles.card}>
          <NBText variant="h3" style={styles.sectionTitle}>
            Lokasi
          </NBText>
          <View style={styles.detailField}>
            <View style={styles.fieldLabel}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={nbColors.textDefault}
              />
              <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                Alamat
              </NBText>
            </View>
            <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
              {request.address}
            </NBText>
          </View>

          <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
            <View style={styles.fieldLabel}>
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color={nbColors.textDefault}
              />
              <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                Koordinat GPS
              </NBText>
            </View>
            <NBText variant="mono-sm" style={{ marginTop: nbSpacing[2] }}>
              {request.gpsLat?.toFixed(6)}, {request.gpsLng?.toFixed(6)}
            </NBText>
          </View>
        </NBCard>

        {/* Detail Section */}
        <NBCard style={styles.card}>
          <NBText variant="h3" style={styles.sectionTitle}>
            Detail
          </NBText>

          <View style={styles.detailField}>
            <View style={styles.fieldLabel}>
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color={nbColors.textDefault}
              />
              <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                Tanggal Pemangkasan Diharapkan
              </NBText>
            </View>
            <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
              {formatDate(request.expectedDate)}
            </NBText>
          </View>

          <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
            <View style={styles.fieldLabel}>
              <MaterialCommunityIcons
                name="tree"
                size={20}
                color={nbColors.textDefault}
              />
              <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                Estimasi Jumlah Pohon
              </NBText>
            </View>
            <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
              {request.estimatedPlantCount} pohon
            </NBText>
          </View>

          {request.notes && (
            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <View style={styles.fieldLabel}>
                <MaterialCommunityIcons
                  name="note-text"
                  size={20}
                  color={nbColors.textDefault}
                />
                <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                  Catatan
                </NBText>
              </View>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.notes}
              </NBText>
            </View>
          )}
        </NBCard>

        {/* Photos Section */}
        {request.photoUrls && request.photoUrls.length > 0 && (
          <NBCard style={styles.card}>
            <NBText variant="h3" style={styles.sectionTitle}>
              Foto Lokasi ({request.photoUrls.length})
            </NBText>
            <View style={styles.photoGrid}>
              {request.photoUrls.map((photoUrl, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(photoUrl)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Foto lokasi ${index + 1} dari ${request.photoUrls.length}`}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photoThumbnail}
                  />
                  <View style={styles.photoOverlay}>
                    <MaterialCommunityIcons
                      name="magnify"
                      size={24}
                      color={nbColors.bgDefault}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </NBCard>
        )}

        {/* Review Section (if reviewed) */}
        {request.reviewedAt && (
          <NBCard style={styles.card}>
            <NBText variant="h3" style={styles.sectionTitle}>
              Review
            </NBText>

            <View style={styles.detailField}>
              <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                Direview oleh
              </NBText>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.reviewedBy?.name || 'Admin'}
              </NBText>
            </View>

            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                Tanggal Review
              </NBText>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {formatDateTime(request.reviewedAt)}
              </NBText>
            </View>

            {request.reviewNotes && (
              <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
                <NBText variant="body-sm" style={{ color: nbColors.textTertiary }}>
                  Catatan Review
                </NBText>
                <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                  {request.reviewNotes}
                </NBText>
              </View>
            )}
          </NBCard>
        )}

        {/* Task Conversion Section */}
        {request.status === 'converted' && request.convertedTaskId && (
          <NBCard style={styles.card}>
            <NBText variant="h3" style={styles.sectionTitle}>
              Tugas Terkait
            </NBText>
            <NBText
              variant="body"
              style={{ marginBottom: nbSpacing[3], color: nbColors.textSecondary }}
            >
              Permohonan ini telah dikonversi menjadi tugas kerja.
            </NBText>
            <NBButton
              variant="primary"
              label="Lihat Tugas"
              onPress={handleViewTask}
              leftIcon="link-variant"
            />
          </NBCard>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <PhotoModal
        visible={photoModalVisible}
        photoUrl={selectedPhoto}
        onClose={() => setPhotoModalVisible(false)}
      />

      {error && (
        <View style={styles.errorContainer}>
          <NBAlert
            type="error"
            title="Terjadi kesalahan"
            message={error}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgDefault,
  },
  scrollContent: {
    padding: nbSpacing[4],
    paddingBottom: nbSpacing[6],
  },
  headerCard: {
    marginBottom: nbSpacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  card: {
    marginBottom: nbSpacing[4],
  },
  sectionTitle: {
    marginBottom: nbSpacing[3],
    color: nbColors.textDefault,
  },
  detailField: {
    marginBottom: nbSpacing[0],
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing[2],
    marginTop: nbSpacing[3],
  },
  photoThumbnail: {
    width: '48%',
    height: 120,
    borderRadius: nbBorderRadius.md,
    backgroundColor: nbColors.bgSecondary,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: nbBorderRadius.md,
    opacity: 0,
  },
  photoLarge: {
    width: '100%',
    height: '80%',
  },
  photoModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: nbSpacing[4],
    right: nbSpacing[4],
    zIndex: 10,
    padding: nbSpacing[2],
  },
  errorContainer: {
    position: 'absolute',
    bottom: nbSpacing[4],
    left: nbSpacing[4],
    right: nbSpacing[4],
  },
});
