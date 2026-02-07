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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { NBAlert, NBBackgroundPattern } from '../../components/nb';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBTextInput } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
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
  // Photo list ref for auto-scroll
  const photoListRef = useRef<FlatList>(null);

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

        // Auto-scroll to the right to show the newly added photo
        setTimeout(() => {
          photoListRef.current?.scrollToEnd({ animated: true });
        }, 100);
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

          // Reset photo list scroll position to left
          setTimeout(() => {
            photoListRef.current?.scrollToOffset({ offset: 0, animated: false });
          }, 100);

          // Refresh GPS location for next report
          getCurrentLocation();

          Alert.alert('Berhasil', 'Laporan berhasil dikirim!', [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('TasksReports', { activeTab: 'reports' });
              },
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

        // Reset photo list scroll position to left
        setTimeout(() => {
          photoListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, 100);

        // Refresh GPS location for next report
        getCurrentLocation();

        Alert.alert(
          'Mode Offline',
          'Laporan disimpan dan akan dikirim saat online.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('TasksReports', { activeTab: 'reports' });
              },
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
        testID="add-photo-button"
        accessibilityLabel="Tambah foto"
      >
        <Text style={styles.addPhotoIcon}>+</Text>
        <Text style={styles.addPhotoText}>Foto</Text>
      </TouchableOpacity>
    );
  }, [form.photos.length, handleAddPhotoFromCamera]);

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error banner */}
        {reportError && (
          <NBAlert
            variant="danger"
            message={reportError}
            dismissible
            onDismiss={() => dispatch(setError(''))}
            testID="report-submission-error"
          />
        )}

        {/* Offline warning */}
        {!isOnline && (
          <NBCard variant="outlined" style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              ⚠️ Mode Offline - Laporan akan disimpan dan dikirim saat online
            </Text>
          </NBCard>
        )}

        {/* Photos section */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📸 FOTO LAPORAN</Text>
            <Text style={styles.sectionSubtitle}>Tambahkan 1-5 foto pekerjaan yang dilakukan</Text>
          </NBCardHeader>
          <NBCardContent>
            {errors.photos && <Text style={styles.errorText}>{errors.photos}</Text>}
            <FlatList
              ref={photoListRef}
              data={form.photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              ListFooterComponent={renderAddPhotoButton}
              style={styles.photoList}
            />
          </NBCardContent>
        </NBCard>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <NBTextInput
            label="📝 DESKRIPSI PEKERJAAN"
            placeholder="Contoh: Menyiram tanaman di area A, memangkas rumput liar..."
            multiline
            numberOfLines={6}
            maxLength={500}
            value={form.description}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, description: text }));
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            error={errors.description}
            hint={`${form.description.length}/500 karakter`}
            style={styles.descriptionInput}
            textAlignVertical="top"
          />
        </View>

        {/* Work type */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>🏷️ JENIS PEKERJAAN</Text>
          </NBCardHeader>
          <NBCardContent>
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
          </NBCardContent>
        </NBCard>

        {/* GPS location */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📍 LOKASI GPS</Text>
          </NBCardHeader>
          <NBCardContent>
            {errors.location && <Text style={styles.errorText}>{errors.errorText}</Text>}
            {isLoadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator color={nbColors.primary} />
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
              <NBButton
                title="Dapatkan Lokasi GPS"
                onPress={getCurrentLocation}
                variant="secondary"
              />
            )}
          </NBCardContent>
        </NBCard>

        {/* Submit button */}
        <NBButton
          title={isOnline ? 'Kirim Laporan' : 'Simpan untuk Sync'}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </ScrollView>
    </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Let NBBackgroundPattern handle background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: nbSpacing.md,                   // 16px - MATCH Home screen exactly
    paddingBottom: nbSpacing.xl * 2,         // 48px (comfortable bottom space)
    flexGrow: 1,
    justifyContent: 'center',                // Centers content with title removed
  },
  header: {
    marginBottom: nbSpacing.md,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
  },
  card: {
    marginBottom: nbSpacing.md,              // Match TaskCompleteScreen card margin (16px)
  },
  descriptionSection: {
    marginBottom: nbSpacing.md,              // Same margin as other sections (16px)
    // NO padding - NBTextInput has its own internal padding
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,      // lg (20px) for prominence
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,              // Small margin below title
    letterSpacing: 0.5,
    textTransform: 'uppercase',              // NB loves caps for hierarchy
  },
  sectionSubtitle: {
    fontSize: nbTypography.fontSize.sm,      // 14px
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    // No margin - let NBCardContent handle spacing
  },
  descriptionInput: {
    minHeight: 140,                          // Increased from 4 lines to 6 lines (better for longer descriptions)
  },
  offlineWarning: {
    backgroundColor: nbColors.warningLight,
    borderWidth: nbBorders.base,
    borderColor: nbColors.warning,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  offlineWarningText: {
    color: nbColors.warning,
    fontSize: nbTypography.fontSize.sm,
  },
  photoList: {
    marginTop: nbSpacing.sm,
  },
  photoItem: {
    marginRight: nbSpacing.sm,
    position: 'relative',
  },
  photoThumbnail: {
    width: 160, // Increased from 120 to 160dp for better visibility outdoors
    height: 160, // Increased from 120 to 160dp for better visibility outdoors
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: nbColors.danger,
    width: 48, // Increased from 24 to 48dp for glove-friendly touch target
    height: 48, // Increased from 24 to 48dp for glove-friendly touch target
    borderRadius: 24,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...nbShadows.sm, // Hard-edge shadow for better visibility outdoors
  },
  removePhotoText: {
    color: nbColors.white,
    fontSize: 24, // Increased from 16 to 24 for better visibility
    fontWeight: nbTypography.fontWeight.bold,
  },
  addPhotoButton: {
    width: 160, // Matched to thumbnail size
    height: 160, // Matched to thumbnail size
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.gray[50],
  },
  addPhotoIcon: {
    fontSize: 32,
    color: nbColors.gray[600],
  },
  addPhotoText: {
    color: nbColors.gray[600],
    fontSize: nbTypography.fontSize.xs,
    marginTop: nbSpacing.xs,
  },
  emptyPhotoButton: {
    height: 120,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.gray[50],
  },
  emptyPhotoIcon: {
    fontSize: 48,
  },
  emptyPhotoText: {
    color: nbColors.gray[600],
    fontSize: nbTypography.fontSize.sm,
    marginTop: nbSpacing.sm,
  },
  descriptionInput: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    padding: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    minHeight: 100,
  },
  characterCounter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: nbSpacing.xs,
  },
  characterCountText: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  workTypeOption: {
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.white,
  },
  workTypeOptionSelected: {
    borderColor: nbColors.primary,
    backgroundColor: withAlpha(nbColors.primary, 0.1),
    ...nbShadows.sm, // Hard-edge shadow for selected state
  },
  workTypeOptionText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    textAlign: 'left',
  },
  workTypeOptionTextSelected: {
    color: nbColors.primary,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  locationLoadingText: {
    marginLeft: nbSpacing.sm,
    color: nbColors.gray[600],
  },
  locationInfo: {
    padding: nbSpacing.lg,                   // md → lg (20px for better readability)
    backgroundColor: withAlpha(nbColors.accentSky, 0.15), // Cyan tint background (15% opacity)
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,                         // Hard-edge shadow for emphasis
  },
  locationText: {
    fontSize: nbTypography.fontSize.lg,      // base → lg (18px for better visibility)
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold, // medium → bold
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospace for coordinates
  },
  locationAccuracy: {
    fontSize: nbTypography.fontSize.base,    // sm → base (16px for better visibility)
    color: nbColors.gray[700],               // Darker for better contrast
    fontWeight: nbTypography.fontWeight.medium,
    marginTop: nbSpacing.sm,                 // xs → sm (more separation)
  },
  errorText: {
    color: nbColors.danger,
    fontSize: nbTypography.fontSize.sm,
    marginBottom: nbSpacing.sm, // Space below error message
  },
});
