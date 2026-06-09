/**
 * Activity Submission Screen
 * Phase 2C: Field workers submit activities with photos, type, and description
 * Supports offline queueing and auto-save drafts
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBAlert, NBBackgroundPattern, NBText } from '../../components/nb';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBSelect, NBCardTextInput, type NBSelectOption } from '../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import { PhotoUploader } from '../../components/common';
import { useActivityForm } from '../../hooks';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import type { MainTabScreenProps } from '../../types/navigation.types';

/**
 * Activity Submission Screen Component
 */
export function ActivitySubmissionScreen(): React.JSX.Element {
  const navigation = useNavigation<MainTabScreenProps<'ActivitySubmission'>['navigation']>();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    form,
    errors,
    isLoadingLocation,
    sortedActivityTypes,
    isLoadingTypes,
    isSubmitting,
    isOnline,
    activityError,
    taggableUsers,
    isLoadingTaggableUsers,
    getCurrentLocation,
    loadActivityTypes,
    addPhoto,
    handleRemovePhoto,
    handleSubmit,
    setDescription,
    setActivityTypeId,
    setTaggedUserIds,
    clearError,
    resetForm,
    clearDraft,
    saveDraft,
    restoreDraft,
  } = useActivityForm();

  // Restore draft when screen gains focus (tab navigation keeps component mounted)
  // useRef avoids re-triggering useFocusEffect on state change, so restoreDraft runs only on re-focus (not mount)
  const hasRestoredOnMount = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (hasRestoredOnMount.current) {
        hasRestoredOnMount.current = false;
        return;
      }
      restoreDraft();
    }, [restoreDraft]),
  );

  const hasFormData = useMemo(
    () => form.photos.length > 0 || form.description.length > 0 || form.activityTypeId !== null,
    [form.photos.length, form.description.length, form.activityTypeId],
  );

  const activityTypeOptions = useMemo<NBSelectOption[]>(
    () => sortedActivityTypes.map((t) => ({ label: t.name, value: t.id })),
    [sortedActivityTypes],
  );

  const taggableOptions = useMemo<NBSelectOption[]>(
    () => taggableUsers.map((u) => ({ label: u.full_name, value: u.id })),
    [taggableUsers],
  );

  const navigateBack = useCallback(() => {
    navigation.navigate('TasksActivities', { initialTab: 'activities' });
  }, [navigation]);

  // Prompt user to save draft or discard when leaving with unsaved data
  const handleLeave = useCallback(() => {
    if (!hasFormData) {
      navigateBack();
      return;
    }
    Alert.alert(
      'Simpan Draft?',
      'Simpan data aktivitas sebagai draft?',
      [
        {
          text: 'Tidak',
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            resetForm();
            navigateBack();
          },
        },
        {
          text: 'Ya',
          onPress: async () => {
            await saveDraft();
            resetForm();
            navigateBack();
          },
        },
      ],
    );
  }, [hasFormData, resetForm, clearDraft, navigateBack, saveDraft]);

  // Override header back button to use handleLeave with discard/draft prompt
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader title="Buat Aktivitas" onBack={handleLeave} />
      ),
    });
  }, [navigation, handleLeave]);

  const onSubmit = useCallback(() => {
    handleSubmit(
      () => navigation.navigate('ClockInOut'),
      () => navigation.navigate('TasksActivities', { initialTab: 'activities' }),
      () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
    );
  }, [handleSubmit, navigation]);

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Validation error summary */}
          {Object.values(errors).some(Boolean) && (
            <View style={styles.errorSummary}>
              <View style={styles.errorSummaryTitleRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={nbColors.danger} />
                <NBText variant="body-sm" style={styles.errorSummaryTitleStyle}> Mohon lengkapi data berikut:</NBText>
              </View>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <NBText key={i} variant="body-sm" style={styles.errorSummaryItemStyle}>• {msg}</NBText>
              ))}
            </View>
          )}

          {/* Error banner */}
          {activityError && (
            <NBAlert
              variant="danger"
              message={activityError}
              dismissible
              onDismiss={clearError}
              testID="activity-submission-error"
            />
          )}

          {/* Offline warning */}
          {!isOnline && (
            <NBCard style={styles.offlineWarning}>
              <NBText variant="body-sm" color="warning" style={styles.offlineWarningTextStyle}>
                Mode Offline - Aktivitas akan disimpan dan dikirim saat online
              </NBText>
            </NBCard>
          )}

          {/* Photos section */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="camera" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> FOTO AKTIVITAS</NBText>
              </View>
              <NBText variant="body-sm" style={styles.sectionSubtitleStyle}>Tambahkan 1-3 foto pekerjaan yang dilakukan</NBText>
            </NBCardHeader>
            <NBCardContent>
              <PhotoUploader
                photos={form.photos}
                onAdd={addPhoto}
                onRemove={handleRemovePhoto}
                error={errors.photos}
              />
            </NBCardContent>
          </NBCard>

          {/* Activity Type Picker */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3" style={styles.sectionTitleStyle}>🏷️ JENIS AKTIVITAS</NBText>
            </NBCardHeader>
            <NBCardContent>
              {isLoadingTypes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" style={styles.loadingTextStyle}>Memuat jenis aktivitas...</NBText>
                </View>
              ) : activityTypeOptions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <NBText variant="body-sm" style={styles.emptyTextStyle}>Tidak ada jenis aktivitas tersedia</NBText>
                  <NBButton title="Coba Lagi" onPress={loadActivityTypes} variant="secondary" size="sm" />
                </View>
              ) : (
                <NBSelect
                  value={form.activityTypeId ?? ''}
                  onValueChange={(v) => setActivityTypeId(String(v))}
                  options={activityTypeOptions}
                  placeholder="Pilih jenis aktivitas..."
                  searchable
                  searchPlaceholder="Cari jenis aktivitas..."
                />
              )}
              {errors.activityType && <NBText variant="body-sm" style={styles.errorTextStyle}>{errors.activityType}</NBText>}
            </NBCardContent>
          </NBCard>

          {/* Tagged Users (optional, ADR-038) */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3" style={styles.sectionTitleStyle}>🏷️ TAG REKAN KERJA</NBText>
              <NBText variant="body-sm" style={styles.sectionSubtitleStyle}>
                Opsional — tag rekan satu area yang ikut bekerja pada aktivitas ini
              </NBText>
            </NBCardHeader>
            <NBCardContent>
              {isLoadingTaggableUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" style={styles.loadingTextStyle}>Memuat daftar rekan...</NBText>
                </View>
              ) : taggableOptions.length > 0 ? (
                <NBSelect
                  selectedValues={form.taggedUserIds}
                  onValuesChange={setTaggedUserIds}
                  options={taggableOptions}
                  placeholder="Pilih rekan untuk di-tag..."
                  searchable
                  searchPlaceholder="Cari nama rekan..."
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <NBText variant="body-sm" style={styles.emptyTextStyle}>Tidak ada rekan satu area untuk di-tag</NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Description */}
          <NBCardTextInput
            title="📝 Deskripsi Pekerjaan"
            required
            value={form.description}
            onChangeText={setDescription}
            placeholder="Contoh: Menyiram tanaman di area A, memangkas rumput liar..."
            numberOfLines={6}
            maxLength={500}
            error={errors.description}
            style={styles.card}
          />

          {/* GPS location */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3" style={styles.sectionTitleStyle}>📍 LOKASI GPS</NBText>
            </NBCardHeader>
            <NBCardContent>
              {errors.location && <NBText variant="body-sm" style={styles.errorTextStyle}>{errors.location}</NBText>}
              {isLoadingLocation ? (
                <View style={styles.locationLoading}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" style={styles.locationLoadingTextStyle}>Mendapatkan lokasi...</NBText>
                </View>
              ) : form.location ? (
                <View style={styles.locationInfo}>
                  <NBText variant="mono-sm" style={styles.locationTextStyle}>
                    {form.location.latitude.toFixed(6)}, {form.location.longitude.toFixed(6)}
                  </NBText>
                  <NBText variant="body-sm" style={styles.locationAccuracyStyle}>
                    Akurasi: ±{Math.round(form.location.accuracy)}m
                  </NBText>
                </View>
              ) : (
                <NBButton title="Dapatkan Lokasi GPS" onPress={getCurrentLocation} variant="secondary" />
              )}
            </NBCardContent>
          </NBCard>
        </ScrollView>

        {/* Fixed FAB buttons — matching TasksActivityScreen FAB pattern */}
        <View style={styles.fab}>
          <View style={styles.fabButtonRow}>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title="Batal"
                variant="secondary"
                onPress={handleLeave}
                disabled={isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title={isOnline ? 'Kirim Aktivitas' : 'Simpan untuk Sync'}
                onPress={onSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.md,
  },
  fab: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
  fabButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  fabButtonHalf: {
    flex: 1,
  },
  card: {
    marginBottom: nbSpacing.md,
  },
  sectionTitleStyle: {},
  sectionSubtitleStyle: {},
  offlineWarning: {
    backgroundColor: nbColors.warningLight,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.warning,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  offlineWarningTextStyle: {},
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  locationLoadingTextStyle: {
    marginLeft: nbSpacing.sm,
  },
  locationInfo: {
    padding: nbSpacing.lg,
    backgroundColor: withAlpha(nbColors.info, 0.15),
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationTextStyle: {},
  locationAccuracyStyle: {
    marginTop: nbSpacing.sm,
  },
  errorTextStyle: {
    marginBottom: nbSpacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  loadingTextStyle: {
    marginLeft: nbSpacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: nbSpacing.lg,
  },
  emptyTextStyle: {
    marginBottom: nbSpacing.md,
  },
  errorSummary: {
    backgroundColor: withAlpha(nbColors.danger, 0.06),
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.danger,
    borderRadius: nbRadius.sm,
    padding: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  errorSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  errorSummaryTitleStyle: {},
  errorSummaryItemStyle: {
    marginTop: 2,
  },
});
