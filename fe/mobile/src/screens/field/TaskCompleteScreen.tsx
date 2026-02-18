/**
 * Task Complete Screen
 * Phase 2C: simplified — description + photo only (GPS removed)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern } from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
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
  const photoListRef = useRef<FlatList>(null);

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

  const handleAddPhotoFromCamera = useCallback(async () => {
    if (!mediaService.validatePhotoCount(photos.length)) {
      Alert.alert('Maksimal Foto', `Maksimal ${mediaService.getMaxPhotos()} foto.`);
      return;
    }
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
        setPhotos((prev) => [...prev, photo]);
        setTimeout(() => photoListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {
      Alert.alert('Error', 'Gagal mengambil foto');
    }
  }, [photos.length]);

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
      await tasksApi.completeTask(task.id, {
        description: description.trim(),
        completion_photo_url: photos[0].uri,
      });
      clearForm();
      Alert.alert('Berhasil', 'Tugas berhasil diselesaikan', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Gagal menyelesaikan tugas. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, photos, description, navigation, clearForm]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <FieldHomeHeader title="Selesaikan Tugas" onBack={handleCancel} />,
    });
  }, [navigation, handleCancel]);

  const renderPhotoItem = useCallback(({ item }: { item: Photo }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => handleRemovePhoto(item.id)}
        accessibilityLabel="Hapus foto"
      >
        <Text style={styles.removePhotoText}>✕</Text>
      </TouchableOpacity>
    </View>
  ), [handleRemovePhoto]);

  const renderAddPhotoButton = useCallback(() => {
    if (!mediaService.validatePhotoCount(photos.length)) return null;
    return (
      <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhotoFromCamera}>
        <Text style={styles.addPhotoIcon}>+</Text>
        <Text style={styles.addPhotoText}>Foto</Text>
      </TouchableOpacity>
    );
  }, [photos.length, handleAddPhotoFromCamera]);

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
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Deskripsi Penyelesaian *</Text>
          </NBCardHeader>
          <NBCardContent>
            <TextInput
              style={styles.notesInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Jelaskan hasil pekerjaan..."
              placeholderTextColor={nbColors.gray['400']}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </NBCardContent>
        </NBCard>

        {/* Photo Evidence */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Foto Bukti *</Text>
            <Text style={styles.sectionSubtitle}>Tambahkan 1 foto hasil pekerjaan</Text>
          </NBCardHeader>
          <NBCardContent>
            <FlatList
              ref={photoListRef}
              data={photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              ListFooterComponent={renderAddPhotoButton}
              style={styles.photoList}
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
  photoList: { marginTop: nbSpacing.sm },
  photoItem: { marginRight: nbSpacing.sm, position: 'relative' },
  photoThumbnail: { width: 160, height: 160, borderRadius: nbBorderRadius.base, borderWidth: nbBorders.base, borderColor: nbColors.black },
  removePhotoButton: { position: 'absolute', top: -12, right: -12, backgroundColor: nbColors.danger, width: 48, height: 48, borderRadius: 24, borderWidth: nbBorders.base, borderColor: nbColors.black, alignItems: 'center', justifyContent: 'center', ...nbShadows.sm },
  removePhotoText: { color: nbColors.white, fontSize: 24, fontWeight: nbTypography.fontWeight.bold },
  addPhotoButton: { width: 160, height: 160, borderRadius: nbBorderRadius.base, borderWidth: nbBorders.base, borderColor: nbColors.black, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: nbColors.gray['50'] },
  addPhotoIcon: { fontSize: 32, color: nbColors.gray['600'] },
  addPhotoText: { color: nbColors.gray['600'], fontSize: nbTypography.fontSize.xs, marginTop: nbSpacing.xs },
  notesInput: { borderWidth: nbBorders.base, borderColor: nbColors.black, borderRadius: nbBorderRadius.base, padding: nbSpacing.md, fontSize: nbTypography.fontSize.base, color: nbColors.black, backgroundColor: nbColors.white, minHeight: 100 },
  actionContainer: { marginHorizontal: nbSpacing.md, marginTop: nbSpacing.md, gap: nbSpacing.sm },
});

export default TaskCompleteScreen;
