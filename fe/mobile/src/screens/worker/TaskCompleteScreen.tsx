/**
 * Task Complete Screen
 *
 * Allows workers to complete a task with:
 * - Photo evidence (required)
 * - Completion notes
 * - GPS location verification
 */

import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import { NBButton, NBCard, NBCardHeader, NBCardContent } from '../../components/nb';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

const fontSizes = typography.fontSize;
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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
  }, [taskId, navigation]);

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

  const handleTakePhoto = useCallback(() => {
    Alert.alert('Pilih Sumber', 'Pilih sumber foto:', [
      {
        text: 'Kamera',
        onPress: async () => {
          try {
            const result = await launchCamera({
              mediaType: 'photo',
              quality: 0.8,
              maxWidth: 1920,
              maxHeight: 1080,
              saveToPhotos: false,
            });

            if (result.assets && result.assets[0]?.uri) {
              setPhotoUri(result.assets[0].uri);
            }
          } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Gagal mengakses kamera');
          }
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          try {
            const result = await launchImageLibrary({
              mediaType: 'photo',
              quality: 0.8,
              maxWidth: 1920,
              maxHeight: 1080,
            });

            if (result.assets && result.assets[0]?.uri) {
              setPhotoUri(result.assets[0].uri);
            }
          } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Gagal mengakses galeri');
          }
        },
      },
      { text: 'Batal', style: 'cancel' },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!task) {return;}

    // Validation
    if (!photoUri) {
      Alert.alert('Error', 'Foto bukti penyelesaian wajib diambil');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Lokasi GPS diperlukan. Silakan aktifkan GPS.');
      return;
    }

    setIsSubmitting(true);
    try {
      await tasksApi.completeTask(task.id, {
        completion_photo_url: photoUri, // Will be uploaded in real implementation
        completion_notes: notes.trim() || undefined,
        gps_lat: location.latitude,
        gps_lng: location.longitude,
      });

      Alert.alert('Berhasil', 'Tugas berhasil diselesaikan', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to home, removing the task screens from stack
            navigation.reset({
              index: 0,
              routes: [{ name: 'WorkerHome' }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to complete task:', error);
      Alert.alert('Error', 'Gagal menyelesaikan tugas. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, photoUri, notes, location, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tugas tidak ditemukan</Text>
        <NBButton title="Kembali" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
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
          <Text style={styles.sectionTitle}>Foto Bukti *</Text>
        </NBCardHeader>
        <NBCardContent>
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <NBButton
                title="Ganti Foto"
                variant="secondary"
                size="sm"
                onPress={handleTakePhoto}
                style={styles.retakeButton}
              />
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Belum ada foto</Text>
              <NBButton title="Ambil Foto" variant="primary" onPress={handleTakePhoto} />
            </View>
          )}
        </NBCardContent>
      </NBCard>

      {/* Location Status */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <Text style={styles.sectionTitle}>Lokasi GPS</Text>
        </NBCardHeader>
        <NBCardContent>
          {isGettingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="sm" color={colors.primary} />
              <Text style={styles.locationLoadingText}>
                Mendapatkan lokasi...
              </Text>
            </View>
          ) : location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                Lat: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Lng: {location.longitude.toFixed(6)}
              </Text>
              {location.accuracy && (
                <Text style={styles.locationAccuracy}>
                  Akurasi: {Math.round(location.accuracy)}m
                </Text>
              )}
              <NBButton
                title="Perbarui Lokasi"
                variant="secondary"
                size="sm"
                onPress={getLocation}
                style={styles.refreshLocationButton}
              />
            </View>
          ) : (
            <View style={styles.locationError}>
              <Text style={styles.locationErrorText}>
                Lokasi tidak tersedia
              </Text>
              <NBButton title="Dapatkan Lokasi" variant="primary" size="sm" onPress={getLocation} />
            </View>
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
            placeholderTextColor={colors.textSecondary}
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
          disabled={isSubmitting || !photoUri || !location}
          loading={isSubmitting}
          style={styles.submitButton}
        />
        <NBButton
          title="Batal"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  taskTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  taskArea: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  retakeButton: {
    alignSelf: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  photoPlaceholderText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  locationLoadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  locationInfo: {
    padding: spacing.sm,
  },
  locationText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationAccuracy: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  refreshLocationButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  locationError: {
    alignItems: 'center',
    padding: spacing.md,
  },
  locationErrorText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  notesInput: {
    borderWidth: 3,
    borderColor: colors.black,
    borderRadius: 0,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  actionContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  submitButton: {
    marginBottom: spacing.xs,
  },
});

export default TaskCompleteScreen;
