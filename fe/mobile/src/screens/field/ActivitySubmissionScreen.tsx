/**
 * Activity Submission Screen
 * Phase 2C: Field workers submit activities with photos, type, and description
 * Supports offline queueing and auto-save drafts
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NBAlert, NBBackgroundPattern } from '../../components/nb';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBTextInput } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import { useActivityForm } from '../../hooks';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import type { MainTabScreenProps } from '../../types/navigation.types';
import type { Photo } from '../../services/media';

/**
 * Activity Submission Screen Component
 */
export function ActivitySubmissionScreen(): React.JSX.Element {
  const navigation = useNavigation<MainTabScreenProps<'ActivitySubmission'>['navigation']>();
  const photoListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    form,
    errors,
    isLoadingLocation,
    activityTypes,
    sortedActivityTypes,
    isLoadingTypes,
    isSubmitting,
    isOnline,
    activityError,
    getCurrentLocation,
    loadActivityTypes,
    handleAddPhoto,
    handleRemovePhoto,
    handleSubmit,
    setDescription,
    setActivityTypeId,
    clearError,
    resetForm,
    clearDraft,
    saveDraft,
    restoreDraft,
  } = useActivityForm(photoListRef);

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

  const renderPhotoItem = useCallback(({ item }: { item: Photo }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => handleRemovePhoto(item.id)}
        accessibilityRole="button"
        accessibilityLabel="Hapus foto"
        accessibilityHint="Ketuk untuk menghapus foto ini dari aktivitas"
      >
        <Text style={styles.removePhotoText}>✕</Text>
      </TouchableOpacity>
    </View>
  ), [handleRemovePhoto]);

  const renderAddPhotoButton = useCallback(() => {
    if (form.photos.length >= 3) { return null; }
    return (
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={handleAddPhoto}
        testID="add-photo-button"
        accessibilityLabel="Tambah foto"
      >
        <Text style={styles.addPhotoIcon}>+</Text>
        <Text style={styles.addPhotoText}>Foto</Text>
      </TouchableOpacity>
    );
  }, [form.photos.length, handleAddPhoto]);

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
      backgroundColor={nbColors.background}
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
              <Text style={styles.errorSummaryTitle}>⚠️ Mohon lengkapi data berikut:</Text>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <Text key={i} style={styles.errorSummaryItem}>• {msg}</Text>
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
              <Text style={styles.offlineWarningText}>
                ⚠️ Mode Offline - Aktivitas akan disimpan dan dikirim saat online
              </Text>
            </NBCard>
          )}

          {/* Photos section */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📸 FOTO AKTIVITAS</Text>
              <Text style={styles.sectionSubtitle}>Tambahkan 1-3 foto pekerjaan yang dilakukan</Text>
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

          {/* Activity Type Picker */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>🏷️ JENIS AKTIVITAS</Text>
            </NBCardHeader>
            <NBCardContent>
              {errors.activityType && <Text style={styles.errorText}>{errors.activityType}</Text>}
              {isLoadingTypes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <Text style={styles.loadingText}>Memuat jenis aktivitas...</Text>
                </View>
              ) : activityTypes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Tidak ada jenis aktivitas tersedia</Text>
                  <NBButton title="Coba Lagi" onPress={loadActivityTypes} variant="secondary" size="sm" />
                </View>
              ) : (
                <FlatList
                  data={sortedActivityTypes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item: type }) => (
                    <TouchableOpacity
                      style={[
                        styles.activityTypeOption,
                        form.activityTypeId === type.id && styles.activityTypeOptionSelected,
                      ]}
                      onPress={() => setActivityTypeId(type.id)}
                    >
                      <Text
                        style={[
                          styles.activityTypeOptionText,
                          form.activityTypeId === type.id && styles.activityTypeOptionTextSelected,
                        ]}
                      >
                        {form.activityTypeId === type.id ? '✓ ' : ''}{type.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  nestedScrollEnabled={false}
                  scrollEnabled={false}
                />
              )}
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
              onChangeText={setDescription}
              error={errors.description}
              helperText={`${form.description.length}/500 karakter`}
              inputStyle={styles.descriptionInput}
              textAlignVertical="top"
            />
          </View>

          {/* GPS location */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📍 LOKASI GPS</Text>
            </NBCardHeader>
            <NBCardContent>
              {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
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
  descriptionSection: {
    marginBottom: nbSpacing.md,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
  },
  descriptionInput: {
    minHeight: 140,
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
    width: 160,
    height: 160,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: nbColors.danger,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...nbShadows.sm,
  },
  removePhotoText: {
    color: nbColors.white,
    fontSize: 24,
    fontWeight: nbTypography.fontWeight.bold,
  },
  addPhotoButton: {
    width: 160,
    height: 160,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.gray['50'],
  },
  addPhotoIcon: {
    fontSize: 32,
    color: nbColors.gray['600'],
  },
  addPhotoText: {
    color: nbColors.gray['600'],
    fontSize: nbTypography.fontSize.xs,
    marginTop: nbSpacing.xs,
  },
  activityTypeOption: {
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.white,
  },
  activityTypeOptionSelected: {
    borderColor: nbColors.primary,
    backgroundColor: withAlpha(nbColors.primary, 0.1),
    ...nbShadows.sm,
  },
  activityTypeOptionText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    textAlign: 'left',
  },
  activityTypeOptionTextSelected: {
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
    color: nbColors.gray['600'],
  },
  locationInfo: {
    padding: nbSpacing.lg,
    backgroundColor: withAlpha(nbColors.accentSky, 0.15),
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationText: {
    fontSize: nbTypography.fontSize.lg,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationAccuracy: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
    marginTop: nbSpacing.sm,
  },
  errorText: {
    color: nbColors.danger,
    fontSize: nbTypography.fontSize.sm,
    marginBottom: nbSpacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  loadingText: {
    marginLeft: nbSpacing.sm,
    color: nbColors.gray['600'],
    fontSize: nbTypography.fontSize.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: nbSpacing.lg,
  },
  emptyText: {
    color: nbColors.gray['600'],
    fontSize: nbTypography.fontSize.sm,
    marginBottom: nbSpacing.md,
  },
  errorSummary: {
    backgroundColor: '#FEF2F2',
    borderWidth: nbBorders.base,
    borderColor: nbColors.danger,
    borderRadius: nbBorderRadius.sm,
    padding: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  errorSummaryTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.danger,
    marginBottom: nbSpacing.xs,
  },
  errorSummaryItem: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.danger,
    marginTop: 2,
  },
});
