/**
 * Task Complete Screen
 * Phase 2C: simplified — description + photo only (GPS removed)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern, NBCardTextInput } from '../../components/nb';
import { PhotoUploader } from '../../components/common';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import { nbColors, nbSpacing, nbTypography } from '../../constants/nbTokens';
import { mediaService, type Photo } from '../../services/media';
import * as tasksApi from '../../services/api/tasksApi';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import type { Task } from '../../types/models.types';

type TaskCompleteRouteProp = RouteProp<MainTabParamList, 'TaskComplete'>;
type TaskCompleteNavigationProp = MainTabScreenProps<'TaskComplete'>['navigation'];

export function TaskCompleteScreen(): React.JSX.Element {
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
      } catch (error) {
        Alert.alert('Error', 'Gagal memuat detail tugas', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTask();
  }, [taskId, navigation]);

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
      Alert.alert('Batalkan?', 'Data yang telah diisi akan hilang.', [
        { text: 'Tidak', style: 'cancel' },
        { text: 'Ya', style: 'destructive', onPress: () => { clearForm(); navigation.goBack(); } },
      ]);
    } else {
      navigation.goBack();
    }
  }, [photos.length, description, clearForm, navigation]);

  const handleSubmit = useCallback(async () => {
    if (!task) return;
    if (photos.length === 0) {
      Alert.alert('Error', 'Minimal 1 foto bukti penyelesaian wajib diambil');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Deskripsi penyelesaian wajib diisi');
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
      Alert.alert('Berhasil', 'Tugas berhasil diselesaikan', [
        { text: 'OK', onPress: () => navigation.navigate('TasksActivities', { initialTab: 'tasks' }) },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Gagal menyelesaikan tugas. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, photos, description, navigation, clearForm]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <FieldHomeHeader title="Selesaikan Tugas" onBack={handleCancel} />,
    });
  }, [navigation, handleCancel]);

  if (isLoading) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!task) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Tugas tidak ditemukan</Text>
          <NBButton title="Kembali" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Task Info */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Tugas</Text>
          </NBCardHeader>
          <NBCardContent>
            <Text style={styles.taskTitle}>{task.title}</Text>
            {task.area && <Text style={styles.taskArea}>Area: {task.area.name}</Text>}
            {task.rayon && <Text style={styles.taskArea}>Rayon: {task.rayon.name}</Text>}
          </NBCardContent>
        </NBCard>

        {/* Description (required) */}
        <NBCardTextInput
          title="Deskripsi Penyelesaian"
          required
          value={description}
          onChangeText={setDescription}
          placeholder="Jelaskan hasil pekerjaan..."
          numberOfLines={4}
          style={styles.card}
        />

        {/* Photo Evidence */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📸 FOTO BUKTI *</Text>
            <Text style={styles.sectionSubtitle}>Tambahkan 1-3 foto hasil pekerjaan</Text>
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
            title="Selesaikan Tugas"
            variant="success"
            onPress={handleSubmit}
            disabled={isSubmitting || photos.length === 0 || !description.trim()}
            loading={isSubmitting}
          />
          <NBButton title="Batal" variant="secondary" onPress={handleCancel} disabled={isSubmitting} />
        </View>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { paddingVertical: nbSpacing.md, paddingBottom: nbSpacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  loadingText: { marginTop: nbSpacing.md, fontSize: nbTypography.fontSize.base, color: nbColors.gray['600'] },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', paddingHorizontal: nbSpacing.lg },
  errorText: { fontSize: nbTypography.fontSize.lg, color: nbColors.danger, marginBottom: nbSpacing.md, textAlign: 'center' },
  card: { marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md },
  sectionTitle: { fontSize: nbTypography.fontSize.lg, fontWeight: nbTypography.fontWeight.extrabold, color: nbColors.black, marginBottom: nbSpacing.xs, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionSubtitle: { fontSize: nbTypography.fontSize.sm, fontWeight: nbTypography.fontWeight.medium, color: nbColors.gray['600'], marginBottom: nbSpacing.md },
  taskTitle: { fontSize: nbTypography.fontSize.base, fontWeight: '600', color: nbColors.black, marginBottom: nbSpacing.xs },
  taskArea: { fontSize: nbTypography.fontSize.sm, color: nbColors.gray['600'] },
  actionContainer: { marginHorizontal: nbSpacing.md, marginTop: nbSpacing.md, gap: nbSpacing.sm },
});

export default TaskCompleteScreen;
