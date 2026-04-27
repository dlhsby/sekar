/**
 * Pruning Request Detail Screen
 * Phase 3 sub-phase 3-10: Read-only view of submitted request
 * Shows all submitted data, photos, review notes, status, and task conversion link
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import {
  fetchPruningRequestById,
  reviewPruningRequest,
} from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import { NBCard, NBBadge, NBButton, NBAlert } from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { ConvertToTaskSheet } from '../../components/admin/ConvertToTaskSheet';
import { NBToast } from '../../components/nb/NBToast';
import { nbColors, nbSpacing, nbBorderRadius } from '../../constants/nbTokens';
import type { PruningRequestStatus } from '../../types/models.types';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { useUserRole } from '../../hooks/useUserRole';

/**
 * Type-safe navigation prop
 */
type DetailScreenProps = NativeStackScreenProps<any, 'PruningDetail'>;

/**
 * Admin review modal helper
 */
function ReviewModal({
  visible,
  isApproving,
  onApprove,
  onReject,
  onClose,
}: {
  visible: boolean;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const [reviewNotes, setReviewNotes] = useState<string>('');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          <NBText variant="h3" style={{ marginBottom: nbSpacing[3] }}>
            Pilih Keputusan
          </NBText>

          <NBButton
            variant="success"
            label="Setujui"
            onPress={onApprove}
            leftIcon="check"
            disabled={isApproving}
            style={{ marginBottom: nbSpacing[2] }}
          />

          <NBButton
            variant="danger"
            label="Tolak"
            onPress={onReject}
            leftIcon="close"
            disabled={isApproving}
            style={{ marginBottom: nbSpacing[3] }}
          />

          <NBButton
            variant="secondary"
            label="Batal"
            onPress={onClose}
            disabled={isApproving}
          />
        </View>
      </View>
    </Modal>
  );
}

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
            color={nbColors.bgCanvas}
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
  const { requestId, adminMode = false } = props.route.params;
  const userRole = useUserRole();

  const { byId, isLoading, error, reviewingId } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const request = byId[requestId] || null;

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [convertSheetVisible, setConvertSheetVisible] = useState(false);

  // Check if user can admin
  const canAdmin = useMemo(
    () =>
      adminMode &&
      ['admin_data', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'].includes(
        userRole,
      ),
    [adminMode, userRole],
  );

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
      navigation.navigate('TaskDetail', { taskId: request.convertedTaskId });
    }
  }, [request?.convertedTaskId, navigation]);

  const handleApprove = useCallback(() => {
    setReviewModalVisible(false);
    dispatch(reviewPruningRequest({ id: requestId, decision: 'approve' }))
      .unwrap()
      .then(() => {
        NBToast.show({
          level: 'success',
          title: 'Berhasil',
          message: 'Permohonan telah disetujui',
        });
      })
      .catch((err) => {
        NBToast.show({
          level: 'danger',
          title: 'Gagal',
          message: err?.message || 'Gagal menyetujui permohonan',
        });
      });
  }, [requestId, dispatch]);

  const handleReject = useCallback(() => {
    setReviewModalVisible(false);
    dispatch(reviewPruningRequest({ id: requestId, decision: 'reject' }))
      .unwrap()
      .then(() => {
        NBToast.show({
          level: 'success',
          title: 'Berhasil',
          message: 'Permohonan telah ditolak',
        });
      })
      .catch((err) => {
        NBToast.show({
          level: 'danger',
          title: 'Gagal',
          message: err?.message || 'Gagal menolak permohonan',
        });
      });
  }, [requestId, dispatch]);

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
                style={{ color: nbColors.gray500, marginTop: nbSpacing[1] }}
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
                color={nbColors.black}
              />
              <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
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
                color={nbColors.black}
              />
              <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                Koordinat GPS
              </NBText>
            </View>
            <NBText variant="mono-sm" style={{ marginTop: nbSpacing[2] }}>
              {/* TypeORM serializes numeric/decimal columns as strings, so coerce
                  before formatting — direct .toFixed on a string crashes. */}
              {request.gpsLat != null && request.gpsLng != null
                ? `${Number(request.gpsLat).toFixed(6)}, ${Number(request.gpsLng).toFixed(6)}`
                : '—'}
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
                color={nbColors.black}
              />
              <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
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
                color={nbColors.black}
              />
              <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                Jumlah Pohon
              </NBText>
            </View>
            <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
              {(request.treeCount ?? request.estimatedPlantCount ?? '—')}{' '}pohon
            </NBText>
          </View>

          {request.treeHeightEstimate ? (
            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <View style={styles.fieldLabel}>
                <MaterialCommunityIcons name="ruler" size={20} color={nbColors.black} />
                <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                  Tinggi (Perkiraan)
                </NBText>
              </View>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.treeHeightEstimate}
              </NBText>
            </View>
          ) : null}

          {request.treeDiameterEstimate ? (
            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <View style={styles.fieldLabel}>
                <MaterialCommunityIcons name="circle-outline" size={20} color={nbColors.black} />
                <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                  Diameter (Perkiraan)
                </NBText>
              </View>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.treeDiameterEstimate}
              </NBText>
            </View>
          ) : null}

          {(request.requesterName || request.requesterPhone) ? (
            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <View style={styles.fieldLabel}>
                <MaterialCommunityIcons name="account" size={20} color={nbColors.black} />
                <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                  Pemohon
                </NBText>
              </View>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.requesterName ?? '—'}
                {request.requesterPhone ? ` · ${request.requesterPhone}` : ''}
              </NBText>
            </View>
          ) : null}

          {(request.rtLeaderName || request.rtLeaderPhone) ? (
            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <View style={styles.fieldLabel}>
                <MaterialCommunityIcons name="account-tie" size={20} color={nbColors.black} />
                <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                  Ketua RT
                </NBText>
              </View>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.rtLeaderName ?? '—'}
                {request.rtLeaderPhone ? ` · ${request.rtLeaderPhone}` : ''}
              </NBText>
            </View>
          ) : null}

          {request.notes && (
            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <View style={styles.fieldLabel}>
                <MaterialCommunityIcons
                  name="note-text"
                  size={20}
                  color={nbColors.black}
                />
                <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
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
                      color={nbColors.bgCanvas}
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
              <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                Direview oleh
              </NBText>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {request.reviewedBy?.name || 'Admin'}
              </NBText>
            </View>

            <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
              <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
                Tanggal Review
              </NBText>
              <NBText variant="body" style={{ marginTop: nbSpacing[2] }}>
                {formatDateTime(request.reviewedAt)}
              </NBText>
            </View>

            {request.reviewNotes && (
              <View style={[styles.detailField, { marginTop: nbSpacing[4] }]}>
                <NBText variant="body-sm" style={{ color: nbColors.gray500 }}>
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
              style={{ marginBottom: nbSpacing[3], color: nbColors.gray600 }}
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

        {/* Admin Action Buttons */}
        {canAdmin && ['submitted', 'under_review'].includes(request.status) && (
          <NBCard style={styles.card}>
            <NBText variant="h3" style={styles.sectionTitle}>
              Aksi Admin
            </NBText>
            <View style={styles.adminButtonGroup}>
              <NBButton
                variant="success"
                label="Setujui"
                onPress={() => setReviewModalVisible(true)}
                leftIcon="check"
                disabled={reviewingId === requestId}
                style={{ flex: 1 }}
              />
              <NBButton
                variant="danger"
                label="Tolak"
                onPress={() => setReviewModalVisible(true)}
                leftIcon="close"
                disabled={reviewingId === requestId}
                style={{ flex: 1 }}
              />
            </View>
          </NBCard>
        )}

        {canAdmin && request.status === 'approved' && (
          <NBCard style={styles.card}>
            <NBText variant="h3" style={styles.sectionTitle}>
              Konversi ke Tugas
            </NBText>
            <NBButton
              variant="primary"
              label="Konversi ke Tugas"
              onPress={() => setConvertSheetVisible(true)}
              leftIcon="arrow-right"
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

      {/* Review Modal */}
      <ReviewModal
        visible={reviewModalVisible}
        isApproving={reviewingId === requestId}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => setReviewModalVisible(false)}
      />

      {/* Convert to Task Sheet */}
      {request && (
        <ConvertToTaskSheet
          visible={convertSheetVisible}
          onClose={() => setConvertSheetVisible(false)}
          request={request}
          onSuccess={() => {
            dispatch(fetchPruningRequestById(requestId));
          }}
        />
      )}

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
    backgroundColor: nbColors.bgCanvas,
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
    color: nbColors.black,
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
    backgroundColor: nbColors.bgSurface,
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
  adminButtonGroup: {
    flexDirection: 'row',
    gap: nbSpacing[3],
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: nbColors.white,
    borderWidth: 2,
    borderColor: nbColors.black,
    borderRadius: 0,
    padding: nbSpacing[4],
    minWidth: '70%',
  },
});
