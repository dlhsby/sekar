/**
 * Overtime Detail Screen
 * Phase 2C: View overtime details and approve/reject (korlap only)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectSelectedOvertime,
  setSelectedOvertime,
  updateOvertime,
  setSubmitting,
  selectOvertimeSubmitting,
} from '../../store/slices/overtimeSlice';
import { getOvertimeById, approveOvertime, rejectOvertime } from '../../services/api/overtimeApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { NBButton, NBCard, NBBadge, NBTextInput, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
import type { OvertimeStatus } from '../../types/models.types';

type RouteParams = {
  overtimeId: string;
};

/**
 * Get status badge color
 */
function getStatusColor(status: OvertimeStatus): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'warning';
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: OvertimeStatus): string {
  switch (status) {
    case 'approved':
      return 'Disetujui';
    case 'pending':
      return 'Menunggu';
    case 'rejected':
      return 'Ditolak';
    default:
      return status;
  }
}

/**
 * Format date
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Overtime Detail Screen Component
 */
export const OvertimeDetailScreen: React.FC<MainTabScreenProps<'OvertimeDetail'>> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { overtimeId } = route.params as RouteParams;
  const dispatch = useAppDispatch();
  const { canApproveOvertime } = useRoleAccess();

  const selectedOvertime = useAppSelector(selectSelectedOvertime);
  const isSubmitting = useAppSelector(selectOvertimeSubmitting);

  const [isLoading, setIsLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch overtime detail
  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const response = await getOvertimeById(overtimeId);
        if (response.data) {
          dispatch(setSelectedOvertime(response.data));
        } else if (response.error) {
          Alert.alert('Error', response.error);
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Gagal memuat detail lembur');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [overtimeId, dispatch, navigation]);

  // Handle approve
  const handleApprove = useCallback(async () => {
    Alert.alert('Konfirmasi', 'Setujui pengajuan lembur ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Setuju',
        onPress: async () => {
          dispatch(setSubmitting(true));
          try {
            const response = await approveOvertime(overtimeId);
            if (response.data) {
              dispatch(updateOvertime(response.data));
              Alert.alert('Berhasil', 'Lembur disetujui', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else if (response.error) {
              Alert.alert('Gagal', response.error);
            }
          } catch (error) {
            Alert.alert('Gagal', 'Terjadi kesalahan');
          } finally {
            dispatch(setSubmitting(false));
          }
        },
      },
    ]);
  }, [overtimeId, dispatch, navigation]);

  // Handle reject
  const handleReject = useCallback(async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Peringatan', 'Alasan penolakan harus diisi');
      return;
    }

    dispatch(setSubmitting(true));
    setShowRejectModal(false);

    try {
      const response = await rejectOvertime(overtimeId, rejectionReason.trim());
      if (response.data) {
        dispatch(updateOvertime(response.data));
        Alert.alert('Berhasil', 'Lembur ditolak', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (response.error) {
        Alert.alert('Gagal', response.error);
      }
    } catch (error) {
      Alert.alert('Gagal', 'Terjadi kesalahan');
    } finally {
      dispatch(setSubmitting(false));
      setRejectionReason('');
    }
  }, [overtimeId, rejectionReason, dispatch, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <NBBackgroundPattern style={styles.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedOvertime) {
    return null;
  }

  const showActions =
    canApproveOvertime && selectedOvertime.status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern style={styles.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Detail Lembur</Text>
          <NBBadge
            color={getStatusColor(selectedOvertime.status)}
            text={getStatusLabel(selectedOvertime.status)}
          />
        </View>

        {/* User Info */}
        {selectedOvertime.user && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Petugas</Text>
            <Text style={styles.sectionValue}>{selectedOvertime.user.full_name}</Text>
          </NBCard>
        )}

        {/* Date and Time */}
        <NBCard style={styles.card}>
          <Text style={styles.sectionTitle}>Tanggal</Text>
          <Text style={styles.sectionValue}>{formatDate(selectedOvertime.date)}</Text>

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            Waktu
          </Text>
          <Text style={styles.sectionValue}>
            {selectedOvertime.start_time} - {selectedOvertime.end_time}
          </Text>
        </NBCard>

        {/* Activity Type */}
        {selectedOvertime.activityType && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Jenis Aktivitas</Text>
            <Text style={styles.sectionValue}>
              {selectedOvertime.activityType.name}
            </Text>
          </NBCard>
        )}

        {/* Description */}
        <NBCard style={styles.card}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.sectionValue}>{selectedOvertime.description}</Text>
        </NBCard>

        {/* Photos */}
        {selectedOvertime.photo_urls.length > 0 && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Foto</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosContainer}
            >
              {selectedOvertime.photo_urls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </NBCard>
        )}

        {/* GPS */}
        {selectedOvertime.gps_lat && selectedOvertime.gps_lng && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Lokasi GPS</Text>
            <Text style={styles.sectionValue}>
              {selectedOvertime.gps_lat.toFixed(6)},{' '}
              {selectedOvertime.gps_lng.toFixed(6)}
            </Text>
          </NBCard>
        )}

        {/* Notes */}
        {selectedOvertime.notes && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.sectionValue}>{selectedOvertime.notes}</Text>
          </NBCard>
        )}

        {/* Rejection Reason */}
        {selectedOvertime.status === 'rejected' &&
          selectedOvertime.rejection_reason && (
            <NBCard style={{
              ...styles.card,
              borderColor: nbColors.danger,
              borderWidth: nbBorders.thick
            }}>
              <Text style={[styles.sectionTitle, {color: nbColors.danger}]}>
                Alasan Penolakan
              </Text>
              <Text style={styles.sectionValue}>
                {selectedOvertime.rejection_reason}
              </Text>
            </NBCard>
          )}

        {/* Actions for korlap */}
        {showActions && (
          <View style={styles.actionsContainer}>
            <NBButton
              title="Tolak"
              variant="danger"
              onPress={() => setShowRejectModal(true)}
              disabled={isSubmitting}
              style={styles.actionButton}
            />
            <NBButton
              title={isSubmitting ? 'Memproses...' : 'Setuju'}
              onPress={handleApprove}
              disabled={isSubmitting}
              style={styles.actionButton}
            />
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alasan Penolakan</Text>
            <NBTextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Masukkan alasan penolakan..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <NBButton
                title="Batal"
                variant="secondary"
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                style={styles.modalButton}
              />
              <NBButton
                title="Tolak"
                variant="danger"
                onPress={handleReject}
                disabled={!rejectionReason.trim()}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: nbSpacing.md,
  },
  loadingText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  scrollContent: {
    paddingBottom: nbSpacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  headerTitle: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  card: {
    margin: nbSpacing.md,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
  },
  sectionTitleSpaced: {
    marginTop: nbSpacing.md,
  },
  sectionValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
  },
  photosContainer: {
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    marginTop: nbSpacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  modalContent: {
    backgroundColor: nbColors.white,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    padding: nbSpacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: nbSpacing.md,
    marginTop: nbSpacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
