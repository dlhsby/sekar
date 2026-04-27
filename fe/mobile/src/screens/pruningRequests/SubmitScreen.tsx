/**
 * Pruning Request Submit Screen
 * 5-step wizard for staff_kecamatan to submit pruning requests
 * Phase 3 sub-phase 3-10
 *
 * Wizard flow:
 * 1. Address + GPS auto-capture
 * 2. Photos 3..5
 * 3. Detail (expected date + target count)
 * 4. Preview (read-only summary)
 * 5. Success (reference code)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import NetInfo from '@react-native-community/netinfo';
import { nbColors, nbSpacing, nbShadows, nbBorders, nbBorderRadius, nbTypography } from '../../constants/nbTokens';
import { NBButton, NBCard, NBCardContent, NBCardHeader, NBCardTextInput, NBAlert, NBDatePicker } from '../../components/nb';
import { PhotoUploader } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  submitPruningRequest,
  updateDraft,
  setDraft,
  clearDraft,
  clearError,
} from '../../store/slices/pruningRequestsSlice';
import { addToQueue } from '../../services/sync/offlineQueue';
import * as mediaService from '../../services/media/mediaService';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { MainTabScreenProps } from '../../types/navigation.types';

type SubmitScreenProps = MainTabScreenProps<'PruningSubmit'>;

const STEP_TITLES = [
  'Alamat & Lokasi',
  'Foto (3-5)',
  'Detail Pekerjaan',
  'Pratinjau',
  'Berhasil',
];

const STEP_DESCRIPTIONS = [
  'Masukkan alamat dan tangkap lokasi GPS Anda',
  'Ambil atau pilih 3-5 foto area yang perlu pemangkasan',
  'Atur tanggal kerja dan estimasi jumlah pohon',
  'Periksa kembali data sebelum mengirim',
  'Permohonan Anda telah dikirim',
];

enum WizardStep {
  Address = 0,
  Photos = 1,
  Detail = 2,
  Preview = 3,
  Success = 4,
}

export function SubmitScreen({ navigation }: SubmitScreenProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { draft, isSubmitting, submitStatus, error } = useAppSelector((state) => state.pruningRequests);
  const { isOnline } = useNetworkStatus();
  const [step, setStep] = useState<WizardStep>(WizardStep.Address);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize draft on mount if not present
  useEffect(() => {
    if (!draft) {
      dispatch(
        setDraft({
          address: '',
          lat: null,
          lng: null,
          detail_date: null,
          target_count: 0,
          photo_keys: [],
          notes: '',
        }),
      );
    }
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  // Handle GPS capture
  const captureLocation = useCallback(() => {
    setIsLoadingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        dispatch(
          updateDraft({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        );
        setIsLoadingLocation(false);
        Alert.alert('Lokasi Tertangkap', `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        setIsLoadingLocation(false);
        Alert.alert('Kesalahan', `Tidak dapat mengambil lokasi: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [dispatch]);

  // Handle photo selection
  const addPhotos = useCallback(async () => {
    try {
      Keyboard.dismiss();
      const newPhotos = await mediaService.pickFromGallery(5);
      if (newPhotos.length > 0) {
        // In real implementation, upload to S3 and get keys
        // For now, use photo URIs as temporary keys
        const photoKeys = newPhotos.map((photo) => photo.uri);
        dispatch(
          updateDraft({
            photo_keys: [...(draft?.photo_keys || []), ...photoKeys],
          }),
        );
      }
    } catch (err) {
      Alert.alert('Kesalahan', `Gagal memilih foto: ${err instanceof Error ? err.message : 'Tidak diketahui'}`);
    }
  }, [dispatch, draft]);

  // Handle photo removal
  const removePhoto = useCallback(
    (index: number) => {
      if (!draft) return;
      const updated = draft.photo_keys.filter((_, i) => i !== index);
      dispatch(updateDraft({ photo_keys: updated }));
    },
    [dispatch, draft],
  );

  // Handle date change (called by NBDatePicker)
  const handleDateChange = useCallback(
    (date: Date) => {
      const isoDate = date.toISOString().split('T')[0];
      dispatch(updateDraft({ detail_date: isoDate }));
    },
    [dispatch],
  );

  // Validate step before proceeding
  const validateStep = useCallback((): boolean => {
    if (!draft) return false;

    switch (step) {
      case WizardStep.Address:
        return draft.address.trim().length > 0 && draft.lat !== null && draft.lng !== null;
      case WizardStep.Photos:
        return draft.photo_keys.length >= 3 && draft.photo_keys.length <= 5;
      case WizardStep.Detail:
        return draft.detail_date !== null && draft.target_count > 0;
      case WizardStep.Preview:
        return true;
      default:
        return false;
    }
  }, [draft, step]);

  // Handle next button
  const handleNext = useCallback(() => {
    if (!validateStep()) {
      Alert.alert('Validasi', 'Silakan isi semua field yang diperlukan');
      return;
    }
    if (step < WizardStep.Preview) {
      setStep(step + 1);
    } else if (step === WizardStep.Preview) {
      // Submit request
      handleSubmit();
    }
  }, [step, validateStep]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!draft || !validateStep()) {
      Alert.alert('Kesalahan', 'Data tidak valid');
      return;
    }

    if (isSubmittingRequest) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      // Re-check network status before submit
      const netInfo = await NetInfo.fetch();
      const currentlyOnline = Boolean(netInfo.isConnected && netInfo.isInternetReachable);

      if (currentlyOnline) {
        // Submit immediately
        const result = await dispatch(
          submitPruningRequest({
            address: draft.address,
            lat: draft.lat!,
            lng: draft.lng!,
            detail_date: draft.detail_date!,
            target_count: draft.target_count,
            photo_keys: draft.photo_keys,
            notes: draft.notes || undefined,
          }),
        ).unwrap();

        setReferenceCode(result.referenceCode);
        setStep(WizardStep.Success);
      } else {
        // Queue for offline sync
        const queueId = await addToQueue('pruning_request.submit', {
          address: draft.address,
          lat: draft.lat,
          lng: draft.lng,
          detail_date: draft.detail_date,
          target_count: draft.target_count,
          photo_keys: draft.photo_keys,
          notes: draft.notes || undefined,
        });

        Alert.alert(
          'Tersimpan Offline',
          `Permohonan Anda disimpan. Akan dikirim saat terhubung internet.\n\nNo: ${queueId.substring(0, 8)}...`,
        );
        setReferenceCode(queueId);
        setStep(WizardStep.Success);
      }
    } catch (err) {
      Alert.alert('Kesalahan', `Gagal mengirim permohonan: ${err instanceof Error ? err.message : 'Tidak diketahui'}`);
    } finally {
      setIsSubmittingRequest(false);
    }
  }, [draft, validateStep, dispatch]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (step === WizardStep.Success) {
      // Reset and go back to step 0
      dispatch(clearDraft());
      setStep(WizardStep.Address);
      setReferenceCode(null);
    } else if (step > WizardStep.Address) {
      setStep(step - 1);
    }
  }, [step, dispatch]);

  if (!draft) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: nbColors.bg.primary }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={nbColors.text.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: nbColors.bg.primary }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with step indicator */}
        <View style={styles.header}>
          <Text style={[nbTypography.h3, { color: nbColors.text.primary }]}>
            {STEP_TITLES[step]}
          </Text>
          <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary, marginTop: nbSpacing.xs }]}>
            Langkah {step + 1} dari {STEP_TITLES.length}
          </Text>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {STEP_TITLES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: index <= step ? nbColors.status.primary : nbColors.bg.tertiary,
                },
              ]}
            />
          ))}
        </View>

        {/* Error alert */}
        {error && (
          <NBAlert
            type="error"
            message={error}
            onDismiss={() => dispatch(clearError())}
          />
        )}

        {/* Step content */}
        {step === WizardStep.Address && (
          <StepAddressContent
            draft={draft}
            isLoadingLocation={isLoadingLocation}
            onAddressChange={(address) => dispatch(updateDraft({ address }))}
            onCaptureLocation={captureLocation}
          />
        )}

        {step === WizardStep.Photos && (
          <StepPhotosContent
            photoCount={draft.photo_keys.length}
            onAddPhotos={addPhotos}
            onRemovePhoto={removePhoto}
          />
        )}

        {step === WizardStep.Detail && (
          <StepDetailContent
            draft={draft}
            onDateChange={handleDateChange}
            onTargetCountChange={(count) => dispatch(updateDraft({ target_count: count }))}
            onNotesChange={(notes) => dispatch(updateDraft({ notes }))}
          />
        )}

        {step === WizardStep.Preview && (
          <StepPreviewContent draft={draft} photoCount={draft.photo_keys.length} />
        )}

        {step === WizardStep.Success && (
          <StepSuccessContent referenceCode={referenceCode || 'PENDING'} />
        )}

      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <NBButton
          variant="outline"
          onPress={handleBack}
          disabled={isSubmitting}
          style={styles.backButton}
        >
          {step === WizardStep.Success ? 'Mulai Ulang' : 'Kembali'}
        </NBButton>
        <NBButton
          variant="primary"
          onPress={handleNext}
          disabled={isSubmitting || isSubmittingRequest || (step !== WizardStep.Success && !validateStep())}
          style={styles.nextButton}
        >
          {isSubmitting || isSubmittingRequest ? (
            <ActivityIndicator size="small" color={nbColors.text.inverse} />
          ) : step === WizardStep.Preview ? (
            'Kirim'
          ) : step === WizardStep.Success ? (
            'Selesai'
          ) : (
            'Lanjut'
          )}
        </NBButton>
      </View>
    </SafeAreaView>
  );
}

/**
 * Step 1: Address & Location
 */
function StepAddressContent({
  draft,
  isLoadingLocation,
  onAddressChange,
  onCaptureLocation,
}: {
  draft: any;
  isLoadingLocation: boolean;
  onAddressChange: (address: string) => void;
  onCaptureLocation: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.stepContent}>
      <NBCard>
        <NBCardContent>
          <NBCardTextInput
            label="Alamat Lengkap"
            placeholder="Jalan, kecamatan, kota"
            value={draft.address}
            onChangeText={onAddressChange}
            multiline
            numberOfLines={3}
            accessibilityLabel="Masukkan alamat lengkap"
            accessibilityHint="Masukkan jalan, kecamatan, dan kota"
          />
        </NBCardContent>
      </NBCard>

      <NBCard style={{ marginTop: nbSpacing.md }}>
        <NBCardHeader>
          <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>Lokasi GPS</Text>
        </NBCardHeader>
        <NBCardContent>
          {draft.lat && draft.lng ? (
            <View>
              <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
                Lat: {draft.lat.toFixed(6)}
              </Text>
              <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
                Lng: {draft.lng.toFixed(6)}
              </Text>
              <NBButton
                variant="outline"
                onPress={onCaptureLocation}
                disabled={isLoadingLocation}
                style={{ marginTop: nbSpacing.md }}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={nbColors.text.primary} />
                ) : (
                  'Perbarui Lokasi'
                )}
              </NBButton>
            </View>
          ) : (
            <View>
              <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary, marginBottom: nbSpacing.md }]}>
                Belum ada lokasi tertangkap
              </Text>
              <NBButton
                variant="primary"
                onPress={onCaptureLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={nbColors.text.inverse} />
                ) : (
                  'Tangkap Lokasi GPS'
                )}
              </NBButton>
            </View>
          )}
        </NBCardContent>
      </NBCard>
    </View>
  );
}

/**
 * Step 2: Photos
 */
function StepPhotosContent({
  photoCount,
  onAddPhotos,
  onRemovePhoto,
}: {
  photoCount: number;
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
}): React.JSX.Element {
  return (
    <View style={styles.stepContent}>
      <NBCard>
        <NBCardContent>
          <Text
            style={[nbTypography['body-sm'], { color: nbColors.text.secondary, marginBottom: nbSpacing.md }]}
          >
            Pilih 3-5 foto ({photoCount}/5)
          </Text>
          <NBButton
            variant="primary"
            onPress={onAddPhotos}
            disabled={photoCount >= 5}
          >
            Pilih Foto dari Galeri
          </NBButton>
          {photoCount === 0 && (
            <Text
              style={[
                nbTypography['body-sm'],
                { color: nbColors.status.danger, marginTop: nbSpacing.md },
              ]}
            >
              Minimal 3 foto diperlukan
            </Text>
          )}
        </NBCardContent>
      </NBCard>

      {photoCount > 0 && (
        <Text
          style={[
            nbTypography['body-sm'],
            { color: nbColors.text.secondary, marginTop: nbSpacing.md, marginBottom: nbSpacing.sm },
          ]}
        >
          {photoCount} foto terpilih
        </Text>
      )}
    </View>
  );
}

/**
 * Step 3: Detail (Date & Count)
 */
function StepDetailContent({
  draft,
  onDateChange,
  onTargetCountChange,
  onNotesChange,
}: {
  draft: any;
  onDateChange: (date: Date) => void;
  onTargetCountChange: (count: number) => void;
  onNotesChange: (notes: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.stepContent}>
      <NBCard>
        <NBCardContent>
          <View style={{ marginBottom: nbSpacing.md }}>
            <NBDatePicker
              label="Tanggal Pekerjaan"
              value={draft.detail_date ? new Date(draft.detail_date) : null}
              onChange={onDateChange}
              minimumDate={new Date()}
              placeholder="Pilih Tanggal"
            />
          </View>

          <NBCardTextInput
            label="Estimasi Jumlah Pohon"
            placeholder="0"
            keyboardType="number-pad"
            value={String(draft.target_count)}
            onChangeText={(text) => onTargetCountChange(parseInt(text, 10) || 0)}
            accessibilityLabel="Masukkan estimasi jumlah pohon"
          />
        </NBCardContent>
      </NBCard>

      <NBCard style={{ marginTop: nbSpacing.md }}>
        <NBCardContent>
          <NBCardTextInput
            label="Catatan Tambahan (Opsional)"
            placeholder="Informasi tambahan..."
            value={draft.notes}
            onChangeText={onNotesChange}
            multiline
            numberOfLines={3}
          />
        </NBCardContent>
      </NBCard>
    </View>
  );
}

/**
 * Step 4: Preview
 */
function StepPreviewContent({
  draft,
  photoCount,
}: {
  draft: any;
  photoCount: number;
}): React.JSX.Element {
  return (
    <View style={styles.stepContent}>
      <NBCard>
        <NBCardHeader>
          <Text style={[nbTypography.h3, { color: nbColors.text.primary }]}>Ringkasan</Text>
        </NBCardHeader>
        <NBCardContent>
          <View style={{ marginBottom: nbSpacing.md }}>
            <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>Alamat</Text>
            <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>
              {draft.address}
            </Text>
          </View>

          <View style={{ marginBottom: nbSpacing.md }}>
            <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
              Lokasi GPS
            </Text>
            <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>
              {draft.lat?.toFixed(6)}, {draft.lng?.toFixed(6)}
            </Text>
          </View>

          <View style={{ marginBottom: nbSpacing.md }}>
            <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
              Tanggal Pekerjaan
            </Text>
            <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>
              {new Date(draft.detail_date).toLocaleDateString('id-ID')}
            </Text>
          </View>

          <View style={{ marginBottom: nbSpacing.md }}>
            <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
              Estimasi Pohon
            </Text>
            <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>
              {draft.target_count} pohon
            </Text>
          </View>

          <View>
            <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
              Foto
            </Text>
            <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>
              {photoCount} foto
            </Text>
          </View>

          {draft.notes && (
            <View style={{ marginTop: nbSpacing.md }}>
              <Text style={[nbTypography['body-sm'], { color: nbColors.text.secondary }]}>
                Catatan
              </Text>
              <Text style={[nbTypography['body'], { color: nbColors.text.primary }]}>
                {draft.notes}
              </Text>
            </View>
          )}
        </NBCardContent>
      </NBCard>
    </View>
  );
}

/**
 * Step 5: Success
 */
function StepSuccessContent({
  referenceCode,
}: {
  referenceCode: string;
}): React.JSX.Element {
  return (
    <View style={styles.stepContent}>
      <NBCard>
        <NBCardContent>
          <View style={{ alignItems: 'center' }}>
            <Text
              style={[
                nbTypography.display,
                { color: nbColors.status.success, marginBottom: nbSpacing.md },
              ]}
            >
              ✓
            </Text>
            <Text
              style={[
                nbTypography.h2,
                { color: nbColors.text.primary, marginBottom: nbSpacing.md },
              ]}
            >
              Berhasil!
            </Text>
            <Text
              style={[
                nbTypography['body'],
                { color: nbColors.text.secondary, textAlign: 'center', marginBottom: nbSpacing.lg },
              ]}
            >
              Permohonan Anda telah dikirim dengan baik.
            </Text>

            <View
              style={[
                styles.referenceBox,
                { borderColor: nbColors.gray['300'], backgroundColor: nbColors.gray['50'] },
              ]}
            >
              <Text style={[nbTypography['caption'], { color: nbColors.text.secondary }]}>
                Kode Referensi
              </Text>
              <Text
                style={[nbTypography['body-lg'], { color: nbColors.text.primary, marginTop: nbSpacing.xs }]}
              >
                {referenceCode}
              </Text>
            </View>

            <Text
              style={[
                nbTypography['body-sm'],
                { color: nbColors.text.secondary, marginTop: nbSpacing.lg, textAlign: 'center' },
              ]}
            >
              Tim kami akan meninjau permohonan Anda dalam 1-2 hari kerja.
            </Text>
          </View>
        </NBCardContent>
      </NBCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
  },
  header: {
    marginBottom: nbSpacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepContent: {
    marginBottom: nbSpacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray['300'],
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
  },
  referenceBox: {
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.md,
    borderWidth: nbBorders.base,
    minWidth: 200,
    alignItems: 'center',
  },
});
