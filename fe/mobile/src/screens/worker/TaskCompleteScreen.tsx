/**
 * Task Complete Screen
 *
 * Allows workers to complete a task with:
 * - Photo evidence (required)
 * - Completion notes
 * - GPS location verification
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
  Platform,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from 'react-native-geolocation-service';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const fontSizes = nbTypography.fontSize;
import * as tasksApi from '../../services/api/tasksApi';
import type { WorkerTabParamList } from '../../types/navigation.types';
import type { Task } from '../../types/models.types';

type TaskCompleteRouteProp = RouteProp<WorkerTabParamList, 'TaskComplete'>;
type TaskCompleteNavigationProp = NativeStackNavigationProp<WorkerTabParamList, 'TaskComplete'>;

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function TaskCompleteScreen(): React.JSX.Element {
  const navigation = useNavigation<TaskCompleteNavigationProp>();
  const route = useRoute<TaskCompleteRouteProp>();
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const photoListRef = useRef<FlatList>(null);

  // Define getLocation BEFORE useEffect that uses it
  const getLocation = useCallback(() => {
    setIsGettingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        setIsGettingLocation(false);
        Alert.alert(
          'Lokasi Tidak Tersedia',
          'Tidak dapat mendapatkan lokasi. Pastikan GPS aktif.',
          [{ text: 'Coba Lagi', onPress: getLocation }, { text: 'Batal' }]
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, []);

  // Fetch task details
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await tasksApi.getTaskById(taskId);
        if (response.data) {
          setTask(response.data);
          // Auto-get location when task loads
          getLocation();
        }
      } catch (error) {
        console.error('Failed to fetch task:', error);
        Alert.alert('Error', 'Gagal memuat detail tugas', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId, navigation, getLocation]);

  const handleAddPhotoFromCamera = useCallback(async () => {
    // Check photo limit
    if (!mediaService.validatePhotoCount(photos.length)) {
      Alert.alert(
        'Maksimal Foto',
        `Anda hanya dapat menambahkan maksimal ${mediaService.getMaxPhotos()} foto.`
      );
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
        setPhotos((prev) => [...prev, photo]);

        // Auto-scroll to show newly added photo
        setTimeout(() => {
          photoListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Gagal mengambil foto');
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  const clearForm = useCallback(() => {
    setPhotos([]);
    setNotes('');
  }, []);

  const handleCancel = useCallback(() => {
    if (photos.length > 0 || notes.trim().length > 0) {
      Alert.alert(
        'Batalkan Tugas?',
        'Data yang telah diisi akan hilang. Lanjutkan?',
        [
          { text: 'Tidak', style: 'cancel' },
          {
            text: 'Ya, Batalkan',
            style: 'destructive',
            onPress: () => {
              clearForm();
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [photos.length, notes, clearForm, navigation]);

  const handleSubmit = useCallback(async () => {
    if (!task) {return;}

    // Validation
    if (photos.length === 0) {
      Alert.alert('Error', 'Minimal 1 foto bukti penyelesaian wajib diambil');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Lokasi GPS diperlukan. Silakan aktifkan GPS.');
      return;
    }

    setIsSubmitting(true);
    try {
      await tasksApi.completeTask(task.id, {
        completion_photo_url: photos[0].uri, // First photo as primary
        completion_notes: notes.trim() || undefined,
        gps_lat: location.latitude,
        gps_lng: location.longitude,
      });

      // Clear form on success
      clearForm();

      Alert.alert('Berhasil', 'Tugas berhasil diselesaikan', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to task detail
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to complete task:', error);
      Alert.alert('Error', 'Gagal menyelesaikan tugas. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, photos, notes, location, navigation, clearForm]);

  // Set navigation header with back button
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.headerBackButton}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={28}
            color={nbColors.black}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleCancel]);

  const renderPhotoItem = useCallback(({ item }: { item: Photo }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => handleRemovePhoto(item.id)}
        accessibilityRole="button"
        accessibilityLabel="Hapus foto"
      >
        <Text style={styles.removePhotoText}>✕</Text>
      </TouchableOpacity>
    </View>
  ), [handleRemovePhoto]);

  const renderAddPhotoButton = useCallback(() => {
    if (!mediaService.validatePhotoCount(photos.length)) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={handleAddPhotoFromCamera}
        testID="add-photo-button"
        accessibilityLabel="Tambah foto dari kamera"
      >
        <Text style={styles.addPhotoIcon}>+</Text>
        <Text style={styles.addPhotoText}>Foto</Text>
      </TouchableOpacity>
    );
  }, [photos.length, handleAddPhotoFromCamera]);

  if (isLoading) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!task) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Tugas tidak ditemukan</Text>
          <NBButton title="Kembali" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
      {/* Task Info */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <Text style={styles.sectionTitle}>Tugas</Text>
        </NBCardHeader>
        <NBCardContent>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {task.area && (
            <Text style={styles.taskArea}>Area: {task.area.name}</Text>
          )}
        </NBCardContent>
      </NBCard>

      {/* Photo Evidence */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <Text style={styles.sectionTitle}>📸 FOTO BUKTI PENYELESAIAN *</Text>
          <Text style={styles.sectionSubtitle}>Tambahkan 1-5 foto hasil pekerjaan</Text>
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

      {/* Location Status */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <Text style={styles.sectionTitle}>📍 LOKASI GPS</Text>
        </NBCardHeader>
        <NBCardContent>
          {isGettingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator color={nbColors.primary} />
              <Text style={styles.locationLoadingText}>Mendapatkan lokasi...</Text>
            </View>
          ) : location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationAccuracy}>
                Akurasi: ±{Math.round(location.accuracy || 0)}m
              </Text>
            </View>
          ) : (
            <NBButton
              title="Dapatkan Lokasi GPS"
              onPress={getLocation}
              variant="secondary"
            />
          )}
        </NBCardContent>
      </NBCard>

      {/* Completion Notes */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <Text style={styles.sectionTitle}>Catatan (Opsional)</Text>
        </NBCardHeader>
        <NBCardContent>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tambahkan catatan penyelesaian..."
            placeholderTextColor={nbColors.gray['400']}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </NBCardContent>
      </NBCard>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <NBButton
          title="Selesaikan Tugas"
          variant="success"
          onPress={handleSubmit}
          disabled={isSubmitting || photos.length === 0 || !location}
          loading={isSubmitting}
        />
        <NBButton
          title="Batal"
          variant="secondary"
          onPress={handleCancel}
          disabled={isSubmitting}
        />
      </View>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  headerBackButton: {
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: fontSizes.base,
    color: nbColors.gray['600'],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: nbSpacing.lg,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: nbColors.danger,
    marginBottom: nbSpacing.md,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: nbSpacing.md,
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
    marginBottom: nbSpacing.md,
  },
  taskTitle: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  taskArea: {
    fontSize: fontSizes.sm,
    color: nbColors.gray['600'],
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
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: nbSpacing.lg,
    backgroundColor: nbColors.gray['50'],
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationLoadingText: {
    marginLeft: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  locationInfo: {
    padding: nbSpacing.lg,
    backgroundColor: withAlpha(nbColors.accentSky, 0.15), // Cyan tint 15% opacity
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
  notesInput: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    padding: nbSpacing.md,
    fontSize: fontSizes.base,
    color: nbColors.black,
    backgroundColor: nbColors.white,
    minHeight: 100,
  },
  actionContainer: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
    gap: nbSpacing.sm,
  },
});

export default TaskCompleteScreen;
