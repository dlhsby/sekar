/**
 * Task Create Screen
 * Phase 2C: Create new task with hierarchical assignment validation
 * Access: TASK_CREATORS roles only (korlap, kepala_rayon, top_management, admin_system, superadmin)
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppSelector } from '../../store/hooks';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { createTask } from '../../services/api/tasksApi';
import { getUsers } from '../../services/api/usersApi';
import { VALID_TASK_ASSIGNMENTS } from '../../constants/roles';
import { NBButton, NBTextInput, NBCard, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
import type { CreateTaskRequest } from '../../types/api.types';
import type { TaskPriority, User, Area, Rayon, UserRole } from '../../types/models.types';

/**
 * Priority options
 */
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Mendesak' },
];

/**
 * Form state interface
 */
interface FormState {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: Date | null;
  areaId: string;
  rayonId: string;
  assignedTo: string;
  taggedUserIds: string[];
}

/**
 * Form errors interface
 */
interface FormErrors {
  title?: string;
  description?: string;
}

/**
 * Task Create Screen Component
 */
export const TaskCreateScreen: React.FC<MainTabScreenProps<'TaskCreate'>> = () => {
  const navigation = useNavigation();
  const { role, canCreateTask } = useRoleAccess();
  const user = useAppSelector((state) => state.auth.user);

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    priority: 'medium',
    deadline: null,
    areaId: '',
    rayonId: '',
    assignedTo: '',
    taggedUserIds: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);

  // Check access
  useEffect(() => {
    if (!canCreateTask) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin untuk membuat tugas', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [canCreateTask, navigation]);

  // Fetch assignable users based on role hierarchy
  useEffect(() => {
    const fetchAssignableUsers = async () => {
      if (!role) return;

      const assignableRoles = VALID_TASK_ASSIGNMENTS[role];
      if (!assignableRoles) return;

      setIsLoadingUsers(true);
      try {
        const response = await getUsers();
        if (response.data) {
          // Filter users by assignable roles
          const filtered = response.data.filter((u) =>
            assignableRoles.includes(u.role as UserRole),
          );
          setAssignableUsers(filtered);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchAssignableUsers();
  }, [role]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = 'Judul harus diisi';
    }

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

    setIsSubmitting(true);

    try {
      const request: CreateTaskRequest = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        deadline: form.deadline ? form.deadline.toISOString() : undefined,
        area_id: form.areaId || undefined,
        rayon_id: form.rayonId || undefined,
        assigned_to: form.assignedTo || undefined,
        tagged_user_ids:
          form.taggedUserIds.length > 0 ? form.taggedUserIds : undefined,
      };

      const response = await createTask(request);

      if (response.data) {
        Alert.alert('Berhasil', 'Tugas berhasil dibuat', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (response.error) {
        Alert.alert('Gagal', response.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membuat tugas';
      Alert.alert('Gagal', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validateForm, navigation]);

  // Toggle tagged user
  const toggleTaggedUser = useCallback((userId: string) => {
    setForm((prev) => ({
      ...prev,
      taggedUserIds: prev.taggedUserIds.includes(userId)
        ? prev.taggedUserIds.filter((id) => id !== userId)
        : [...prev.taggedUserIds, userId],
    }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern style={styles.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Buat Tugas Baru</Text>
        </View>

        <NBCard style={styles.card}>
          {/* Title */}
          <NBTextInput
            label="Judul *"
            value={form.title}
            onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))}
            placeholder="Masukkan judul tugas..."
            error={errors.title}
          />

          {/* Description */}
          <NBTextInput
            label="Deskripsi *"
            value={form.description}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, description: text }))
            }
            placeholder="Jelaskan detail tugas..."
            multiline
            numberOfLines={4}
            error={errors.description}
            inputStyle={styles.input}
          />

          {/* Priority */}
          <Text style={styles.label}>Prioritas</Text>
          <View style={styles.optionsContainer}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  form.priority === option.value && styles.optionButtonActive,
                ]}
                onPress={() =>
                  setForm((prev) => ({ ...prev, priority: option.value }))
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    form.priority === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Deadline */}
          <Text style={styles.label}>Batas Waktu (Opsional)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDeadlinePicker(true)}
          >
            <Text style={styles.pickerText}>
              {form.deadline
                ? form.deadline.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Pilih batas waktu...'}
            </Text>
          </TouchableOpacity>
          {form.deadline && (
            <NBButton
              title="Hapus Batas Waktu"
              variant="secondary"
              size="sm"
              onPress={() => setForm((prev) => ({ ...prev, deadline: null }))}
              style={styles.clearButton}
            />
          )}

          {/* Assignee */}
          <Text style={styles.label}>Petugas (Opsional)</Text>
          {isLoadingUsers ? (
            <ActivityIndicator size="small" color={nbColors.primary} />
          ) : assignableUsers.length > 0 ? (
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  !form.assignedTo && styles.optionButtonActive,
                ]}
                onPress={() => setForm((prev) => ({ ...prev, assignedTo: '' }))}
              >
                <Text
                  style={[
                    styles.optionText,
                    !form.assignedTo && styles.optionTextActive,
                  ]}
                >
                  Tidak Ada
                </Text>
              </TouchableOpacity>
              {assignableUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.optionButton,
                    form.assignedTo === u.id && styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    setForm((prev) => ({ ...prev, assignedTo: u.id }))
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      form.assignedTo === u.id && styles.optionTextActive,
                    ]}
                  >
                    {u.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>
              Tidak ada petugas yang dapat ditugaskan
            </Text>
          )}

          {/* Tagged Users */}
          <Text style={styles.label}>Tag Petugas (Opsional)</Text>
          {isLoadingUsers ? (
            <ActivityIndicator size="small" color={nbColors.primary} />
          ) : assignableUsers.length > 0 ? (
            <View style={styles.optionsContainer}>
              {assignableUsers.map((u) => {
                const isTagged = form.taggedUserIds.includes(u.id);
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.optionButton,
                      isTagged && styles.optionButtonActive,
                    ]}
                    onPress={() => toggleTaggedUser(u.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isTagged && styles.optionTextActive,
                      ]}
                    >
                      {u.full_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noDataText}>
              Tidak ada petugas yang dapat di-tag
            </Text>
          )}

          {/* Note */}
          <Text style={styles.noteText}>
            * Area dan Rayon akan otomatis terdeteksi dari penugasan
          </Text>
        </NBCard>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <NBButton
            title={isSubmitting ? 'Membuat...' : 'Buat Tugas'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Deadline Picker */}
      <DatePicker
        modal
        open={showDeadlinePicker}
        date={form.deadline || new Date()}
        mode="date"
        minimumDate={new Date()}
        onConfirm={(date: Date) => {
          setShowDeadlinePicker(false);
          setForm((prev) => ({ ...prev, deadline: date }));
        }}
        onCancel={() => setShowDeadlinePicker(false)}
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
    margin: nbSpacing.md,
  },
  input: {
    marginTop: nbSpacing.md,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
    marginTop: nbSpacing.md,
  },
  optionsContainer: {
    gap: nbSpacing.sm,
  },
  optionButton: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: nbColors.primary,
  },
  optionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  optionTextActive: {
    color: nbColors.white,
  },
  pickerButton: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
  },
  clearButton: {
    marginTop: nbSpacing.sm,
  },
  noDataText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[500],
    fontStyle: 'italic',
  },
  noteText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginTop: nbSpacing.md,
    fontStyle: 'italic',
  },
  submitContainer: {
    paddingHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
  },
});
