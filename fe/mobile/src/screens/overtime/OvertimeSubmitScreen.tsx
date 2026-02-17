/**
 * Overtime Submit Screen
 * Phase 2C: Submit overtime request with photos, activity type, and time range
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import DatePicker from 'react-native-date-picker';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOvertimeSubmitting, setSubmitting, addOvertime, setError } from '../../store/slices/overtimeSlice';
import { submitOvertime } from '../../services/api/overtimeApi';
import { useActivityTypes } from '../../hooks/useActivityTypes';
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
import { NBButton, NBTextInput, NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern, NBAlert } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
import type { CreateOvertimeRequest } from '../../types/api.types';
import type { Coordinates } from '../../types/models.types';

/**
 * Form state interface
 */
interface FormState {
  date: Date;
  startTime: Date;
  endTime: Date;
  photos: Photo[];
  activityTypeId: string;
  description: string;
  notes: string;
  location: Coordinates | null;
}

/**
 * Form errors interface
 */
interface FormErrors {
  date?: string;
  time?: string;
  photos?: string;
  activityType?: string;
  description?: string;
}

/**
 * Format time to HH:mm
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Overtime Submit Screen Component
 */
export const OvertimeSubmitScreen: React.FC<MainTabScreenProps<'OvertimeSubmit'>> = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const isSubmitting = useAppSelector(selectOvertimeSubmitting);
  const { activityTypes, isLoading: loadingActivityTypes } = useActivityTypes();

  const [form, setForm] = useState<FormState>({
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // +1 hour
    photos: [],
    activityTypeId: '',
    description: '',
    notes: '',
    location: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // Auto-capture GPS on mount
  useEffect(() => {
    captureLocation();
  }, []);

  // Capture current location
  const captureLocation = useCallback(() => {
    setIsCapturingLocation(true);
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
        setIsCapturingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        setIsCapturingLocation(false);
        Alert.alert('Peringatan', 'Gagal mendapatkan lokasi GPS');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, []);

  // Capture photo
  const handleCapturePhoto = useCallback(async () => {
    if (form.photos.length >= 3) {
      Alert.alert('Peringatan', 'Maksimal 3 foto');
      return;
    }

    const permissionResult = await requestCameraPermission();
    if (!permissionResult.granted) {
      Alert.alert('Izin Diperlukan', 'Aplikasi memerlukan izin kamera');
      return;
    }

    const photo = await mediaService.capturePhoto(false);
    if (photo) {
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, photo],
      }));
    }
  }, [form.photos.length]);

  // Remove photo
  const handleRemovePhoto = useCallback((photoId: string) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== photoId),
    }));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate time range
    if (form.endTime <= form.startTime) {
      newErrors.time = 'Waktu selesai harus lebih besar dari waktu mulai';
    }

    // Validate photos
    if (form.photos.length === 0) {
      newErrors.photos = 'Minimal 1 foto diperlukan';
    } else if (form.photos.length > 3) {
      newErrors.photos = 'Maksimal 3 foto';
    }

    // Validate activity type
    if (!form.activityTypeId) {
      newErrors.activityType = 'Jenis aktivitas harus dipilih';
    }

    // Validate description
    if (!form.description.trim()) {
      newErrors.description = 'Deskripsi harus diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Validasi Gagal', 'Mohon periksa kembali form');
      return;
    }

    dispatch(setSubmitting(true));

    try {
      // Convert photos to Base64 for upload
      const photoUrls: string[] = [];
      for (const photo of form.photos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoUrls.push(base64);
      }

      // Prepare request
      const request: CreateOvertimeRequest = {
        date: formatDate(form.date),
        start_time: formatTime(form.startTime),
        end_time: formatTime(form.endTime),
        activity_type_id: form.activityTypeId,
        description: form.description.trim(),
        photo_urls: photoUrls,
        gps_lat: form.location?.latitude,
        gps_lng: form.location?.longitude,
        notes: form.notes.trim() || undefined,
      };

      // Submit
      const response = await submitOvertime(request);

      if (response.data) {
        dispatch(addOvertime(response.data));
        Alert.alert('Berhasil', 'Pengajuan lembur berhasil disimpan', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (response.error) {
        dispatch(setError(response.error));
        Alert.alert('Gagal', response.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim data';
      dispatch(setError(message));
      Alert.alert('Gagal', message);
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [form, validateForm, dispatch, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern style={styles.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ajukan Lembur</Text>
        </View>

        {/* Date & Time Card */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📅 TANGGAL & WAKTU</Text>
          </NBCardHeader>
          <NBCardContent>
            {/* Date */}
            <Text style={styles.label}>Tanggal</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerText}>
                {form.date.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            {/* Start Time */}
            <Text style={styles.label}>Waktu Mulai</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.pickerText}>{formatTime(form.startTime)}</Text>
            </TouchableOpacity>

            {/* End Time */}
            <Text style={styles.label}>Waktu Selesai</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={styles.pickerText}>{formatTime(form.endTime)}</Text>
            </TouchableOpacity>
            {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
          </NBCardContent>
        </NBCard>

        {/* Activity Type Card */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>🏷️ JENIS AKTIVITAS</Text>
          </NBCardHeader>
          <NBCardContent>
            {loadingActivityTypes ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.pickerContainer}>
                {activityTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.optionButton,
                      form.activityTypeId === type.id && styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setForm((prev) => ({ ...prev, activityTypeId: type.id }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        form.activityTypeId === type.id && styles.optionTextActive,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.activityType && (
              <Text style={styles.errorText}>{errors.activityType}</Text>
            )}
          </NBCardContent>
        </NBCard>

        {/* Photos Card */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📸 FOTO BUKTI</Text>
            <Text style={styles.sectionSubtitle}>Tambahkan 1-3 foto pekerjaan lembur</Text>
          </NBCardHeader>
          <NBCardContent>
            {errors.photos && <Text style={styles.errorText}>{errors.photos}</Text>}
            <View style={styles.photosContainer}>
              {form.photos.map((photo) => (
                <View key={photo.id} style={styles.photoWrapper}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(photo.id)}
                  >
                    <Text style={styles.photoRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {form.photos.length < 3 && (
                <TouchableOpacity
                  style={styles.photoAdd}
                  onPress={handleCapturePhoto}
                >
                  <Text style={styles.photoAddText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </NBCardContent>
        </NBCard>

        {/* Description Card */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📝 DESKRIPSI</Text>
          </NBCardHeader>
          <NBCardContent>
            <NBTextInput
              label="Deskripsi Aktivitas *"
              value={form.description}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, description: text }))
              }
              placeholder="Jelaskan aktivitas lembur yang dilakukan..."
              multiline
              numberOfLines={4}
              error={errors.description}
            />
          </NBCardContent>
        </NBCard>

        {/* GPS & Notes Card */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📍 LOKASI & CATATAN</Text>
          </NBCardHeader>
          <NBCardContent>
            {/* GPS */}
            <View style={styles.gpsContainer}>
              <Text style={styles.label}>Lokasi GPS</Text>
              {isCapturingLocation ? (
                <ActivityIndicator size="small" color={nbColors.primary} />
              ) : form.location ? (
                <Text style={styles.gpsText}>
                  {form.location.latitude.toFixed(6)}, {form.location.longitude.toFixed(6)}
                </Text>
              ) : (
                <Text style={styles.gpsTextError}>Lokasi tidak tersedia</Text>
              )}
              <NBButton
                title="Perbarui GPS"
                variant="secondary"
                size="sm"
                onPress={captureLocation}
              />
            </View>

            {/* Notes */}
            <NBTextInput
              label="Catatan (Opsional)"
              value={form.notes}
              onChangeText={(text) => setForm((prev) => ({ ...prev, notes: text }))}
              placeholder="Tambahkan catatan jika diperlukan..."
              multiline
              numberOfLines={2}
            />
          </NBCardContent>
        </NBCard>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <NBButton
            title={isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Date Picker */}
      <DatePicker
        modal
        open={showDatePicker}
        date={form.date}
        mode="date"
        onConfirm={(date: Date) => {
          setShowDatePicker(false);
          setForm((prev) => ({ ...prev, date }));
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Start Time Picker */}
      <DatePicker
        modal
        open={showStartTimePicker}
        date={form.startTime}
        mode="time"
        onConfirm={(date: Date) => {
          setShowStartTimePicker(false);
          setForm((prev) => ({ ...prev, startTime: date }));
        }}
        onCancel={() => setShowStartTimePicker(false)}
      />

      {/* End Time Picker */}
      <DatePicker
        modal
        open={showEndTimePicker}
        date={form.endTime}
        mode="time"
        onConfirm={(date: Date) => {
          setShowEndTimePicker(false);
          setForm((prev) => ({ ...prev, endTime: date }));
        }}
        onCancel={() => setShowEndTimePicker(false)}
      />
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
  scrollContent: {
    paddingBottom: nbSpacing['2xl'],
  },
  header: {
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
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
    marginTop: nbSpacing.md,
  },
  pickerButton: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
  },
  pickerContainer: {
    gap: nbSpacing.sm,
  },
  optionButton: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.thick, // Emphasize selected state
  },
  optionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  optionTextActive: {
    color: nbColors.white,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  photoWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: nbBorderRadius.full,
    backgroundColor: nbColors.danger,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    fontSize: 18,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
  photoAdd: {
    width: 100,
    height: 100,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    backgroundColor: nbColors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddText: {
    fontSize: 32,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray[400],
  },
  gpsContainer: {
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  gpsText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
  },
  gpsTextError: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.danger,
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.danger,
    marginTop: nbSpacing.xs,
  },
  submitContainer: {
    paddingHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
  },
});
