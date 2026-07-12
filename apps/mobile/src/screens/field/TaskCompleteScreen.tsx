/**
 * Task Complete Screen
 * Phase 2C: simplified — description + photo only (GPS removed)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern, NBCardTextInput, NBText, NBToast } from '../../components/nb';
import { PhotoUploader } from '../../components/common';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { mediaService, type Photo } from '../../services/media';
import * as tasksApi from '../../services/api/tasksApi';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import type { Task } from '../../types/models.types';

type TaskCompleteRouteProp = RouteProp<MainTabParamList, 'TaskComplete'>;
type TaskCompleteNavigationProp = MainTabScreenProps<'TaskComplete'>['navigation'];

export function TaskCompleteScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<TaskCompleteNavigationProp>();
  const route = useRoute<TaskCompleteRouteProp>();
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await tasksApi.getTaskById(taskId);
        if (response.data) {
          setTask(response.data);
        }
      } catch {
        NBToast.show({ level: 'danger', title: t('tasks:complete.failure'), body: t('tasks:complete.loadingFailed') });
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };
    fetchTask();
  }, [taskId, navigation, t]);

  const handleAddPhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => [...prev, photo]);
  }, []);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  const clearForm = useCallback(() => {
    setPhotos([]);
    setDescription('');
  }, []);

  const handleCancel = useCallback(() => {
    if (photos.length > 0 || description.trim().length > 0) {
      Alert.alert(t('tasks:create.cancelConfirm'), t('tasks:create.cancelConfirm'), [
        { text: t('tasks:create.cancelNo'), style: 'cancel' },
        { text: t('tasks:create.cancelYes'), style: 'destructive', onPress: () => { clearForm(); navigation.goBack(); } },
      ]);
    } else {
      navigation.goBack();
    }
  }, [photos.length, description, clearForm, navigation, t]);

  const handleSubmit = useCallback(async () => {
    if (!task) return;
    if (photos.length === 0) {
      NBToast.show({ level: 'danger', title: t('tasks:complete.photosRequired'), body: t('tasks:complete.photosRequiredMessage') });
      return;
    }
    if (!description.trim()) {
      NBToast.show({ level: 'danger', title: t('tasks:complete.descriptionRequired'), body: t('tasks:complete.descriptionRequiredMessage') });
      return;
    }

    setIsSubmitting(true);
    try {
      const photoBase64Array: string[] = [];
      for (const photo of photos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoBase64Array.push(base64);
      }
      await tasksApi.completeTask(task.id, {
        description: description.trim(),
        completion_photo_urls: photoBase64Array,
      });
      clearForm();
      NBToast.show({ level: 'success', title: t('tasks:complete.success'), body: t('tasks:complete.successMessage') });
      navigation.navigate('Tasks');
    } catch {
      NBToast.show({ level: 'danger', title: t('tasks:complete.failure'), body: t('tasks:complete.failureMessage') });
    } finally {
      setIsSubmitting(false);
    }
  }, [task, photos, description, navigation, clearForm, t]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <FieldHomeHeader title={t('tasks:complete.title')} onBack={handleCancel} />,
    });
  }, [navigation, handleCancel, t]);

  if (isLoading) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" style={styles.loadingTextMargin}>{t('tasks:complete.loading')}</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!task) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.errorContainer}>
          <NBText variant="body-sm" color="danger" style={styles.errorTextMargin}>{t('tasks:complete.notFound')}</NBText>
          <NBButton title={t('common:actions.back')} variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Task Info */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <NBText variant="h3" style={styles.sectionTitleStyle}>{t('tasks:complete.taskSection')}</NBText>
          </NBCardHeader>
          <NBCardContent>
            <NBText variant="body" style={styles.taskTitleStyle}>{task.title}</NBText>
            {task.location && <NBText variant="body-sm" style={styles.taskAreaStyle}>{t("tasks:complete.areaLabel")} {task.location.name}</NBText>}
            {task.rayon && <NBText variant="body-sm" style={styles.taskAreaStyle}>{t("tasks:complete.rayonLabel")} {task.rayon.name}</NBText>}
          </NBCardContent>
        </NBCard>

        {/* Description (required) */}
        <NBCardTextInput
          title={t('tasks:complete.description')}
          required
          value={description}
          onChangeText={setDescription}
          placeholder={t('tasks:complete.descriptionPlaceholder')}
          numberOfLines={4}
          style={styles.card}
        />

        {/* Photo Evidence */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <View style={styles.photoHeaderRow}>
              <MaterialCommunityIcons name="camera" size={16} color={nbColors.black} />
              <NBText variant="mono-sm" style={styles.photoHeaderText}>{t('tasks:complete.photosHeader')}</NBText>
            </View>
            <NBText variant="body-sm" style={styles.sectionSubtitleStyle}>{t('tasks:complete.photosSubtitle')}</NBText>
          </NBCardHeader>
          <NBCardContent>
            <PhotoUploader
              photos={photos}
              onAdd={handleAddPhoto}
              onRemove={handleRemovePhoto}
            />
          </NBCardContent>
        </NBCard>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <NBButton
            title={t('tasks:complete.submitButton')}
            variant="success"
            onPress={handleSubmit}
            disabled={isSubmitting || photos.length === 0 || !description.trim()}
            loading={isSubmitting}
          />
          <NBButton title={t('tasks:complete.cancelButton')} variant="secondary" onPress={handleCancel} disabled={isSubmitting} />
        </View>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { paddingVertical: nbSpacing.md, paddingBottom: nbSpacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  loadingTextMargin: { marginTop: nbSpacing.md },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', paddingHorizontal: nbSpacing.lg },
  errorTextMargin: { marginBottom: nbSpacing.md, textAlign: 'center' },
  card: { marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md },
  sectionTitleStyle: { marginBottom: nbSpacing.xs },
  sectionSubtitleStyle: { marginBottom: nbSpacing.md },
  taskTitleStyle: { marginBottom: nbSpacing.xs },
  taskAreaStyle: {},
  photoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  photoHeaderText: { textTransform: 'uppercase' },
  actionContainer: { marginHorizontal: nbSpacing.md, marginTop: nbSpacing.md, gap: nbSpacing.sm },
});

export default TaskCompleteScreen;
