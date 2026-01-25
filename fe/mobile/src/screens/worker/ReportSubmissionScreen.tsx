/**
 * Report Submission Screen
 * Worker submits work reports with photos, description, and work type
 * Supports offline queueing and auto-save drafts
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Button, Card, ErrorBanner } from '../../components/common';
import { theme } from '../../constants/theme';
import config from '../../constants/config';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { createReport } from '../../services/api/reportsApi';
import { addReport, setSubmitting, setError } from '../../store/slices/reportSlice';
import { addToQueue as addToOfflineQueue } from '../../services/sync/offlineQueue';
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
import { sanitizeMultilineText } from '../../utils/sanitize';

/**
 * Work type options
 */
const WORK_TYPES = [
  { value: 'cleaning', label: 'Pembersihan' },
  { value: 'planting', label: 'Penanaman' },
  { value: 'maintenance', label: 'Pemeliharaan' },
  { value: 'inspection', label: 'Inspeksi' },
] as const;

type WorkType = typeof WORK_TYPES[number]['value'];

/**
 * Form state
 */
interface FormState {
  photos: Photo[];
  description: string;
  workType: WorkType | null;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
}

/**
 * Form errors
 */
interface FormErrors {
  photos?: string;
  description?: string;
  workType?: string;
  location?: string;
}

/**
 * Report Submission Screen Component
 */
export function ReportSubmissionScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { currentShift } = useAppSelector((state) => state.shift);
  const { isOnline } = useAppSelector((state) => state.offline);
  const { isSubmitting, error: reportError } = useAppSelector((state) => state.report);

  const [form, setForm] = useState<FormState>({
    photos: [],
    description: '',
    workType: null,
    location: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showWorkTypePicker, setShowWorkTypePicker] = useState(false);

  // Use ref to store latest form state to prevent stale closures in interval
  const formRef = useRef<FormState>(form);
  // Use ref to store latest saveDraft function to prevent stale closures
  const saveDraftRef = useRef<() => Promise<void>>();

  // Update form ref whenever form changes
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  /**
   * Get current GPS location on mount
   */
  useEffect(() => {
    getCurrentLocation();
    restoreDraft();

    // Auto-save draft every 30 seconds using ref to prevent stale closure
    const draftInterval = setInterval(() => {
      const currentForm = formRef.current;
      // Only auto-save if there's meaningful content
      if (currentForm.description.length >= 5 || currentForm.photos.length > 0) {
        if (saveDraftRef.current) {
          saveDraftRef.current();
        }
      }
    }, 30000);

    return () => clearInterval(draftInterval);
  }, []);

  /**
   * Get current GPS location
   */
  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      Geolocation.getCurrentPosition(
        (position) => {
          setForm((prev) => ({
            ...prev,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          }));
          setErrors((prev) => ({ ...prev, location: undefined }));
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Location error:', error);
          let errorMessage = 'Tidak dapat mendapatkan lokasi GPS';
          if (error.code === 1) {
            errorMessage = 'Izin lokasi ditolak';
          } else if (error.code === 3) {
            errorMessage = 'Waktu habis. Coba di area terbuka.';
          } else if (error.code === 5) {
            errorMessage = 'Aktifkan GPS di pengaturan.';
          }
          setErrors((prev) => ({
            ...prev,
            location: errorMessage,
          }));
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
          forceRequestLocation: true,
          forceLocationManager: false,
          showLocationDialog: true,
        }
      );
    } catch (error) {
      console.error('Location error:', error);
      setIsLoadingLocation(false);
    }
  }, []);

  /**
   * Check available disk space
   * Returns true if enough space is available
   */
  const checkDiskSpace = useCallback(async (): Promise<boolean> => {
    try {
      const freeDiskStorage = await DeviceInfo.getFreeDiskStorage();
      const freeDiskStorageMB = freeDiskStorage / (1024 * 1024); // Convert bytes to MB

      if (freeDiskStorageMB < config.MIN_FREE_STORAGE_MB) {
        Alert.alert(
          'Penyimpanan Penuh',
          `Ruang penyimpanan tersisa ${Math.round(freeDiskStorageMB)}MB. Minimal ${config.MIN_FREE_STORAGE_MB}MB diperlukan untuk menyimpan foto. Hapus beberapa file untuk melanjutkan.`,
          [{ text: 'OK' }]
        );
        return false;
      }

      // Warn if approaching limit (< 200MB)
      if (freeDiskStorageMB < 200) {
        console.warn(`[ReportSubmission] Low disk space: ${Math.round(freeDiskStorageMB)}MB remaining`);
      }

      return true;
    } catch (error) {
      console.error('[ReportSubmission] Failed to check disk space:', error);
      // Don't block on error - allow user to proceed
      return true;
    }
  }, []);

  /**
   * Add photo from camera
   */
  const handleAddPhotoFromCamera = useCallback(async () => {
    // Check photo limit
    if (!mediaService.validatePhotoCount(form.photos.length)) {
      Alert.alert(
        'Maksimal Foto',
        `Anda hanya dapat menambahkan maksimal ${mediaService.getMaxPhotos()} foto.`
      );
      return;
    }

    // Check disk space before capturing photo
    const hasEnoughSpace = await checkDiskSpace();
    if (!hasEnoughSpace) {
      return;
    }

    // Request camera permission
    const permissionResult = await requestCameraPermission();
    if (!permissionResult.granted) {
      if (permissionResult.message) {
        Alert.alert('Izin Kamera', permissionResult.message);
      }
      return;
    }

    try {
      const photo = await mediaService.capturePhoto(false);
      if (photo) {
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, photo],
        }));
        setErrors((prev) => ({ ...prev, photos: undefined }));
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Gagal mengambil foto');
    }
  }, [form.photos, checkDiskSpace]);

  /**
   * Remove photo
   */
  const handleRemovePhoto = useCallback(async (photoId: string) => {
    const photo = form.photos.find((p) => p.id === photoId);
    if (photo) {
      // Delete from filesystem
      await mediaService.deletePhoto(photo.uri);

      // Remove from state
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.filter((p) => p.id !== photoId),
      }));
    }
  }, [form.photos]);

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate photos
    if (form.photos.length === 0) {
      newErrors.photos = 'Tambahkan minimal 1 foto';
    }

    // Validate description
    if (!form.description.trim()) {
      newErrors.description = 'Deskripsi wajib diisi';
    } else if (form.description.length < 5) {
      newErrors.description = 'Deskripsi minimal 5 karakter';
    } else if (form.description.length > 500) {
      newErrors.description = 'Deskripsi maksimal 500 karakter';
    }

    // Validate work type
    if (!form.workType) {
      newErrors.workType = 'Pilih jenis pekerjaan';
    }

    // Validate location
    if (!form.location) {
      newErrors.location = 'Lokasi GPS diperlukan';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Save draft to AsyncStorage
   */
  const saveDraft = useCallback(async () => {
    try {
      const draft = {
        photos: form.photos,
        description: form.description,
        workType: form.workType,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('report_draft', JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [form]);

  // Update saveDraft ref whenever it changes
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  /**
   * Restore draft from AsyncStorage
   */
  const restoreDraft = useCallback(async () => {
    try {
      const draftStr = await AsyncStorage.getItem('report_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        // Only restore if less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          Alert.alert(
            'Draft Ditemukan',
            'Anda memiliki draft laporan yang belum terkirim. Lanjutkan?',
            [
              {
                text: 'Hapus',
                style: 'destructive',
                onPress: () => AsyncStorage.removeItem('report_draft'),
              },
              {
                text: 'Lanjutkan',
                onPress: () => {
                  setForm((prev) => ({
                    ...prev,
                    photos: draft.photos || [],
                    description: draft.description || '',
                    workType: draft.workType || null,
                  }));
                },
              },
            ]
          );
        } else {
          // Delete old draft
          await AsyncStorage.removeItem('report_draft');
        }
      }
    } catch (error) {
      console.error('Failed to restore draft:', error);
    }
  }, []);

  /**
   * Submit report
   */
  const handleSubmit = useCallback(async () => {
    // Check if shift is active
    if (!currentShift) {
      Alert.alert(
        'Shift Belum Aktif',
        'Anda belum clock-in. Clock-in terlebih dahulu untuk membuat laporan.',
        [
          {
            text: 'Clock In Sekarang',
            onPress: () => navigation.navigate('ClockInOut'),
          },
          {
            text: 'Simpan Draft',
            onPress: () => saveDraft(),
          },
        ]
      );
      return;
    }

    // Validate form
    if (!validateForm()) {
      Alert.alert('Form Tidak Valid', 'Periksa kembali form Anda.');
      return;
    }

    dispatch(setSubmitting(true));

    try {
      // Convert photos to Base64 for upload
      const photoBase64Array: string[] = [];
      for (const photo of form.photos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoBase64Array.push(base64);
      }

      // Prepare report data with sanitized description
      const reportData = {
        shift_id: currentShift.id,
        description: sanitizeMultilineText(form.description),
        report_type: form.workType!,
        gps_lat: form.location!.latitude,
        gps_lng: form.location!.longitude,
        photos: photoBase64Array,
      };

      if (isOnline) {
        // Submit online
        const response = await createReport(reportData);
        if (response.error) {
          throw new Error(response.error);
        }
        if (response.data) {
          // Clear draft
          await AsyncStorage.removeItem('report_draft');

          // Reset form state
          setForm({
            photos: [],
            description: '',
            workType: null,
            location: null,
          });

          // Cleanup photos from filesystem
          for (const photo of form.photos) {
            await mediaService.deletePhoto(photo.uri);
          }

          Alert.alert('Berhasil', 'Laporan berhasil dikirim!', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        }
      } else {
        // Queue for offline sync using AsyncStorage queue
        await addToOfflineQueue('report', reportData);

        // Clear draft since it's queued
        await AsyncStorage.removeItem('report_draft');

        // Reset form state
        setForm({
          photos: [],
          description: '',
          workType: null,
          location: null,
        });

        Alert.alert(
          'Mode Offline',
          'Laporan disimpan dan akan dikirim saat online.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Gagal mengirim laporan'));
      Alert.alert(
        'Gagal Mengirim',
        'Terjadi kesalahan. Laporan disimpan sebagai draft.',
        [
          {
            text: 'Coba Lagi',
            onPress: handleSubmit,
          },
          {
            text: 'Simpan Draft',
            onPress: () => saveDraft(),
          },
        ]
      );
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [form, currentShift, isOnline, navigation, dispatch, saveDraft, validateForm]);

  /**
   * Render photo item
   */
  const renderPhotoItem = useCallback(({ item }: { item: Photo }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => handleRemovePhoto(item.id)}
        accessibilityRole="button"
        accessibilityLabel="Hapus foto"
        accessibilityHint="Ketuk untuk menghapus foto ini dari laporan"
      >
        <Text style={styles.removePhotoText}>✕</Text>
      </TouchableOpacity>
    </View>
  ), [handleRemovePhoto]);

  /**
   * Render add photo button
   */
  const renderAddPhotoButton = useCallback(() => {
    if (!mediaService.validatePhotoCount(form.photos.length)) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={handleAddPhotoFromCamera}
      >
        <Text style={styles.addPhotoIcon}>+</Text>
        <Text style={styles.addPhotoText}>Foto</Text>
      </TouchableOpacity>
    );
  }, [form.photos.length, handleAddPhotoFromCamera]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Buat Laporan Kerja</Text>
        </View>

        {/* Error banner */}
        {reportError && (
          <ErrorBanner
            message={reportError}
            onDismiss={() => dispatch(setError(''))}
          />
        )}

        {/* Offline warning */}
        {!isOnline && (
          <Card style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              ⚠️ Mode Offline - Laporan akan disimpan dan dikirim saat online
            </Text>
          </Card>
        )}

        {/* Photos section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Foto/Video (Maks 5)</Text>
          {errors.photos && <Text style={styles.errorText}>{errors.photos}</Text>}

          <FlatList
            data={form.photos}
            renderItem={renderPhotoItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            ListFooterComponent={renderAddPhotoButton}
            style={styles.photoList}
          />

          {form.photos.length === 0 && (
            <TouchableOpacity
              style={styles.emptyPhotoButton}
              onPress={handleAddPhotoFromCamera}
            >
              <Text style={styles.emptyPhotoIcon}>📷</Text>
              <Text style={styles.emptyPhotoText}>Ambil Foto</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Description */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Deskripsi Pekerjaan</Text>
          <RNTextInput
            style={styles.descriptionInput}
            placeholder="Jelaskan pekerjaan yang telah dilakukan..."
            multiline
            numberOfLines={4}
            maxLength={500}
            value={form.description}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, description: text }));
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            textAlignVertical="top"
          />
          <View style={styles.characterCounter}>
            <Text style={styles.characterCountText}>
              {form.description.length}/500 karakter
            </Text>
          </View>
          {errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </Card>

        {/* Work type */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🏷 Jenis Pekerjaan</Text>
          {errors.workType && <Text style={styles.errorText}>{errors.workType}</Text>}

          {WORK_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.workTypeOption,
                form.workType === type.value && styles.workTypeOptionSelected,
              ]}
              onPress={() => {
                setForm((prev) => ({ ...prev, workType: type.value }));
                setErrors((prev) => ({ ...prev, workType: undefined }));
              }}
            >
              <Text
                style={[
                  styles.workTypeOptionText,
                  form.workType === type.value && styles.workTypeOptionTextSelected,
                ]}
              >
                {form.workType === type.value ? '✓ ' : ''}
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* GPS location */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Lokasi</Text>
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

          {isLoadingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.locationLoadingText}>Mendapatkan lokasi...</Text>
            </View>
          ) : form.location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {form.location.latitude.toFixed(6)}, {form.location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationAccuracy}>
                Akurasi: ±{Math.round(form.location.accuracy)}m
              </Text>
            </View>
          ) : (
            <Button
              title="Dapatkan Lokasi GPS"
              onPress={getCurrentLocation}
              variant="outline"
            />
          )}
        </Card>

        {/* Submit button */}
        <Button
          title={isOnline ? 'Kirim Laporan' : 'Simpan untuk Sync'}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  offlineWarning: {
    backgroundColor: theme.colors.warning + '20',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    marginBottom: theme.spacing.md,
  },
  offlineWarningText: {
    color: theme.colors.warning,
    fontSize: 14,
  },
  photoList: {
    marginTop: theme.spacing.sm,
  },
  photoItem: {
    marginRight: theme.spacing.sm,
    position: 'relative',
  },
  photoThumbnail: {
    width: 160, // Increased from 120 to 160dp for better visibility outdoors
    height: 160, // Increased from 120 to 160dp for better visibility outdoors
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: theme.colors.error,
    width: 48, // Increased from 24 to 48dp for glove-friendly touch target
    height: 48, // Increased from 24 to 48dp for glove-friendly touch target
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Add shadow for better visibility outdoors
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  removePhotoText: {
    color: theme.colors.white,
    fontSize: 24, // Increased from 16 to 24 for better visibility
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 160, // Matched to thumbnail size
    height: 160, // Matched to thumbnail size
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: theme.colors.textSecondary,
  },
  addPhotoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  emptyPhotoButton: {
    height: 120,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoIcon: {
    fontSize: 48,
  },
  emptyPhotoText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textPrimary,
    minHeight: 100,
  },
  characterCounter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  characterCountText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  workTypeOption: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  workTypeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  workTypeOptionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  workTypeOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  locationLoadingText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  locationInfo: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  locationAccuracy: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    marginTop: theme.spacing.md,
  },
});
