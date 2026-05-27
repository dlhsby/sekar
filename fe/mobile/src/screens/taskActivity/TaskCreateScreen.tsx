/**
 * Task Create Screen
 * Phase 2C: Create new task with hierarchical assignment validation
 * Access: TASK_CREATORS roles only (korlap, kepala_rayon, top_management, admin_system, superadmin)
 */

import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppSelector } from '../../store/hooks';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { createTask } from '../../services/api/tasksApi';
import { getUsers } from '../../services/api/usersApi';
import { getRayons, getAreasByRayonId } from '../../services/api/rayonsApi';
import { VALID_TASK_ASSIGNMENTS } from '../../constants/roles';
import {
  NBButton,
  NBText,
  NBTextInput,
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBDatePicker,
  NBSelect,
} from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import type { CreateTaskRequest } from '../../types/api.types';
import type { NBSelectOption } from '../../components/nb/NBSelect';
import type { TaskPriority, User, UserRole } from '../../types/models.types';

/**
 * Priority options with color coding
 */
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Rendah', color: nbColors.gray500 },
  { value: 'medium', label: 'Biasa', color: nbColors.accentSky },
  { value: 'high', label: 'Tinggi', color: nbColors.accentSunshine },
  { value: 'urgent', label: 'Mendesak', color: nbColors.danger },
];

/** Roles where rayon is fixed from user profile */
const RAYON_FIXED_ROLES: UserRole[] = ['korlap', 'kepala_rayon'];

/** Roles where area is fixed from user profile */
const AREA_FIXED_ROLES: UserRole[] = ['korlap'];

/**
 * Form state interface
 */
interface FormState {
  title: string;
  description: string;
  priority: TaskPriority | '';
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
  assignedTo?: string;
}

const DRAFT_KEY = 'task_create_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Task Create Screen Component
 */
export const TaskCreateScreen: React.FC<MainTabScreenProps<'TaskCreate'>> = () => {
  const navigation = useNavigation<MainTabScreenProps<'TaskCreate'>['navigation']>();
  const { role, canCreateTask } = useRoleAccess();
  const user = useAppSelector((state) => state.auth.user);
  const scrollViewRef = useRef<ScrollView>(null);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRayons, setIsLoadingRayons] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [rayonOptions, setRayonOptions] = useState<NBSelectOption[]>([]);
  const [areaOptions, setAreaOptions] = useState<NBSelectOption[]>([]);

  const formRef = useRef<FormState>(form);
  const saveDraftRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => { formRef.current = form; }, [form]);

  const isRayonFixed = role ? RAYON_FIXED_ROLES.includes(role as UserRole) : false;
  const isAreaFixed = role ? AREA_FIXED_ROLES.includes(role as UserRole) : false;

  // --- Draft persistence ---
  const saveDraft = useCallback(async () => {
    try {
      const draft = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        assignedTo: form.assignedTo,
        taggedUserIds: form.taggedUserIds,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Silently fail
    }
  }, [form]);

  useEffect(() => { saveDraftRef.current = saveDraft; }, [saveDraft]);

  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem(DRAFT_KEY);
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      deadline: null,
      areaId: user?.area_id || '',
      rayonId: user?.rayon_id || '',
      assignedTo: '',
      taggedUserIds: [],
    });
    setErrors({});
  }, [user?.area_id, user?.rayon_id]);

  const restoreDraft = useCallback(async () => {
    try {
      const draftStr = await AsyncStorage.getItem(DRAFT_KEY);
      if (!draftStr) return;
      const draft = JSON.parse(draftStr);
      if (Date.now() - draft.timestamp < DRAFT_TTL) {
        Alert.alert(
          'Draft Ditemukan',
          'Anda memiliki draft tugas yang belum terkirim. Lanjutkan?',
          [
            { text: 'Hapus', style: 'destructive', onPress: () => AsyncStorage.removeItem(DRAFT_KEY) },
            {
              text: 'Lanjutkan',
              onPress: () => {
                AsyncStorage.removeItem(DRAFT_KEY);
                setForm((prev) => ({
                  ...prev,
                  title: draft.title || '',
                  description: draft.description || '',
                  priority: draft.priority || 'medium',
                  assignedTo: draft.assignedTo || '',
                  taggedUserIds: draft.taggedUserIds || [],
                }));
              },
            },
          ]
        );
      } else {
        await AsyncStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Restore draft on every screen focus (useFocusEffect re-runs when navigating back to screen)
  useFocusEffect(
    useCallback(() => {
      restoreDraft();
    }, [restoreDraft]),
  );

  // Auto-save draft every 30s (set up once on mount)
  useEffect(() => {
    const interval = setInterval(() => {
      const f = formRef.current;
      if (f.title.length > 0 || f.description.length > 0) {
        saveDraftRef.current?.();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Handle leave with draft prompt
  const handleLeave = useCallback(() => {
    const f = formRef.current;
    const hasContent = f.title.trim().length > 0 || f.description.trim().length > 0;

    if (!hasContent) {
      resetForm();
      (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' });
      return;
    }

    Alert.alert(
      'Simpan Draft?',
      'Anda memiliki perubahan yang belum disimpan.',
      [
        {
          text: 'Tidak',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(DRAFT_KEY);
            resetForm();
            (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' });
          },
        },
        {
          text: 'Ya',
          onPress: async () => {
            await saveDraftRef.current?.();
            resetForm();
            (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' });
          },
        },
      ]
    );
  }, [navigation, resetForm]);

  // Override header with FieldHomeHeader
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader title="Buat Tugas" onBack={handleLeave} />
      ),
    });
  }, [navigation, handleLeave]);

  // Check access
  useEffect(() => {
    if (!canCreateTask) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin untuk membuat tugas', [
        { text: 'OK', onPress: () => (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' }) },
      ]);
    }
  }, [canCreateTask, navigation]);

  // Initialize rayon/area from user profile on mount
  useEffect(() => {
    if (!user || !role) return;

    if (isRayonFixed && user.rayon_id) {
      setForm((prev) => ({ ...prev, rayonId: user.rayon_id || '' }));
    }
    if (isAreaFixed && user.area_id) {
      setForm((prev) => ({ ...prev, areaId: user.area_id || '' }));
    }
  }, [user, role, isRayonFixed, isAreaFixed]);

  // Fetch rayons for top_management (non-fixed rayon roles)
  useEffect(() => {
    if (isRayonFixed) return;

    const fetchRayons = async () => {
      setIsLoadingRayons(true);
      try {
        const response = await getRayons();
        if (response.data) {
          setRayonOptions(
            response.data.map((r) => ({ label: r.name, value: r.id })),
          );
        }
      } catch {
        // Silently fail — user can retry
      } finally {
        setIsLoadingRayons(false);
      }
    };

    fetchRayons();
  }, [isRayonFixed]);

  // Fetch areas when rayon changes (for non-area-fixed roles)
  useEffect(() => {
    if (isAreaFixed || !form.rayonId) {
      if (!isAreaFixed) {
        setAreaOptions([]);
      }
      return;
    }

    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const response = await getAreasByRayonId(form.rayonId);
        if (response.data) {
          setAreaOptions(
            response.data.map((a: any) => ({ label: a.name, value: a.id })),
          );
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [form.rayonId, isAreaFixed]);

  // Fetch assignable users based on role hierarchy and selected location
  useEffect(() => {
    const fetchAssignableUsers = async () => {
      if (!role) return;
      // Don't fetch until area is selected (unless area is fixed from profile)
      if (!form.areaId) {
        setAssignableUsers([]);
        return;
      }

      const assignableRoles = VALID_TASK_ASSIGNMENTS[role];
      if (!assignableRoles) return;

      setIsLoadingUsers(true);
      try {
        const response = await getUsers();
        if (response.data) {
          const filtered = response.data.filter((u) => {
            // Must have assignable role
            if (!assignableRoles.includes(u.role as UserRole)) return false;
            // Filter by area — user must be in the selected area
            if (u.area_id && u.area_id === form.areaId) return true;
            // Also include users in the same rayon but no specific area (rayon-level users)
            if (!u.area_id && u.rayon_id && u.rayon_id === form.rayonId) return true;
            return false;
          });

          setAssignableUsers(filtered);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchAssignableUsers();
  }, [role, form.areaId, form.rayonId]);

  // Clear assignee/tagged when area changes (they may no longer be in scope)
  const prevAreaIdRef = useRef(form.areaId);
  useEffect(() => {
    if (prevAreaIdRef.current !== form.areaId) {
      prevAreaIdRef.current = form.areaId;
      setForm((prev) => ({
        ...prev,
        assignedTo: '',
        taggedUserIds: [],
      }));
    }
  }, [form.areaId]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = 'Judul harus diisi';
    }

    if (!form.assignedTo) {
      newErrors.assignedTo = 'Petugas harus dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setIsSubmitting(true);

    try {
      const request: CreateTaskRequest = {
        title: form.title.trim(),
        priority: form.priority as TaskPriority,
        deadline: form.deadline ? form.deadline.toISOString() : undefined,
        area_id: form.areaId || undefined,
        rayon_id: form.rayonId || undefined,
        assigned_to: form.assignedTo || undefined,
        tagged_user_ids:
          form.taggedUserIds.length > 0 ? form.taggedUserIds : undefined,
      };

      // Only include description if non-empty
      if (form.description.trim()) {
        request.description = form.description.trim();
      }

      const response = await createTask(request);

      if (response.data) {
        await clearDraft();
        resetForm();
        Alert.alert('Berhasil', 'Tugas berhasil dibuat', [
          { text: 'OK', onPress: () => (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' }) },
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
  }, [form, validateForm, navigation, clearDraft]);

  // Handle tagged users change (multi-select)
  const handleTaggedUsersChange = useCallback((values: string[]) => {
    setForm((prev) => ({
      ...prev,
      taggedUserIds: values,
      // If the current assignee was just tagged, clear the assignee selection
      assignedTo: values.includes(prev.assignedTo) ? '' : prev.assignedTo,
    }));
  }, []);

  // Handle rayon change — reset area when rayon changes
  const handleRayonChange = useCallback((rayonId: string) => {
    setForm((prev) => ({ ...prev, rayonId, areaId: '' }));
  }, []);

  const needsAreaSelection = !isAreaFixed && !form.areaId;

  // NBSelect options for assignee — exclude users already tagged
  const assigneeOptions: NBSelectOption[] = assignableUsers
    .filter((u) => !form.taggedUserIds.includes(u.id))
    .map((u) => ({ label: u.full_name, value: u.id }));

  // Taggable users = assignable users minus the assigned user
  const taggableOptions: NBSelectOption[] = assignableUsers
    .filter((u) => u.id !== form.assignedTo)
    .map((u) => ({ label: u.full_name, value: u.id }));

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
              <View style={styles.errorSummaryTitleRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={nbColors.danger} />
                <NBText variant="body-sm" style={styles.errorSummaryTitle}> Mohon lengkapi data berikut:</NBText>
              </View>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <NBText key={i} variant="body-sm" style={styles.errorSummaryItem}>• {msg}</NBText>
              ))}
            </View>
          )}

          {/* Title & Description */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="text-box-outline" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> DETAIL TUGAS<NBText variant="mono-sm" style={styles.requiredAsterisk}> *</NBText></NBText>
              </View>
              <NBText variant="body-sm" style={styles.sectionSubtitle}>Isi judul dan deskripsi tugas</NBText>
            </NBCardHeader>
            <NBCardContent>
              <NBTextInput
                label="Judul *"
                value={form.title}
                onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))}
                placeholder="Masukkan judul tugas..."
                error={errors.title}
              />

              <View style={styles.fieldSpacer} />

              <NBTextInput
                label="Deskripsi"
                value={form.description}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, description: text }))
                }
                placeholder="Jelaskan detail tugas..."
                multiline
                numberOfLines={6}
                maxLength={500}
                helperText={`${form.description.length}/500 karakter`}
                inputStyle={styles.descriptionInput}
                textAlignVertical="top"
              />
            </NBCardContent>
          </NBCard>

          {/* Location (Rayon + Area) */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> LOKASI</NBText>
              </View>
              <NBText variant="body-sm" style={styles.sectionSubtitle}>
                {isRayonFixed && isAreaFixed
                  ? 'Lokasi otomatis dari profil Anda'
                  : 'Pilih lokasi penugasan'}
              </NBText>
            </NBCardHeader>
            <NBCardContent>
              {/* Rayon Select */}
              <NBText variant="body-sm" style={styles.fieldLabel}>Rayon</NBText>
              {isLoadingRayons ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" color="gray600" style={styles.loadingText}>Memuat rayon...</NBText>
                </View>
              ) : (
                <NBSelect
                  label="Rayon"
                  value={form.rayonId}
                  onValueChange={handleRayonChange}
                  options={isRayonFixed
                    ? (user?.rayon_id
                        ? [{ label: user?.rayon?.name || 'Rayon Anda', value: user.rayon_id }]
                        : [])
                    : rayonOptions
                  }
                  placeholder="Pilih rayon..."
                  disabled={isRayonFixed}
                />
              )}

              <View style={styles.fieldSpacer} />

              {/* Area Select */}
              <NBText variant="body-sm" style={styles.fieldLabel}>Area</NBText>
              {isLoadingAreas ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" color="gray600" style={styles.loadingText}>Memuat area...</NBText>
                </View>
              ) : (
                <NBSelect
                  label="Area"
                  value={form.areaId}
                  onValueChange={(areaId) =>
                    setForm((prev) => ({ ...prev, areaId }))
                  }
                  options={isAreaFixed
                    ? (user?.area_id
                        ? [{ label: user?.area?.name || 'Area Anda', value: user.area_id }]
                        : [])
                    : areaOptions
                  }
                  placeholder={!form.rayonId && !isAreaFixed ? 'Pilih rayon terlebih dahulu' : 'Pilih area...'}
                  disabled={isAreaFixed || (!isAreaFixed && !form.rayonId)}
                />
              )}
            </NBCardContent>
          </NBCard>

          {/* Priority */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="flag-outline" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> PRIORITAS</NBText>
              </View>
            </NBCardHeader>
            <NBCardContent>
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
                  <NBText
                    variant="body"
                    style={[
                      styles.optionText,
                      form.priority === option.value && styles.optionTextActive,
                    ]}
                  >
                    {form.priority === option.value ? '✓ ' : ''}{option.label}
                  </NBText>
                </TouchableOpacity>
              ))}
            </NBCardContent>
          </NBCard>

          {/* Deadline */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> BATAS WAKTU</NBText>
              </View>
              <NBText variant="body-sm" style={styles.sectionSubtitle}>Opsional — tentukan tenggat tugas (waktu default 23:59)</NBText>
            </NBCardHeader>
            <NBCardContent>
              {/* Date picker */}
              <NBDatePicker
                label="Tanggal"
                value={form.deadline}
                onChange={(date) => {
                  const d = new Date(date);
                  // Preserve existing time if set, otherwise default to end of day (23:59)
                  if (form.deadline) {
                    d.setHours(form.deadline.getHours(), form.deadline.getMinutes(), 0, 0);
                  } else {
                    d.setHours(23, 59, 0, 0);
                  }
                  setForm((prev) => ({ ...prev, deadline: d }));
                }}
                placeholder="Pilih tanggal batas waktu..."
                minimumDate={new Date()}
              />

              {/* Time picker — shown only after date is selected */}
              {form.deadline && (
                <>
                  <View style={styles.fieldSpacer} />
                  <NBDatePicker
                    label="Waktu (opsional, default 23:59)"
                    value={form.deadline}
                    onChange={(timeDate) => {
                      if (!form.deadline) return;
                      const d = new Date(form.deadline);
                      d.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
                      setForm((prev) => ({ ...prev, deadline: d }));
                    }}
                    mode="time"
                    placeholder="Pilih waktu..."
                  />
                  <NBButton
                    title="Hapus Batas Waktu"
                    variant="secondary"
                    size="sm"
                    onPress={() => setForm((prev) => ({ ...prev, deadline: null }))}
                    style={styles.clearButton}
                  />
                </>
              )}
            </NBCardContent>
          </NBCard>

          {/* Assignee (mandatory) — NBSelect with search */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="account-arrow-right" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> PENUGASAN<NBText variant="mono-sm" style={styles.requiredAsterisk}> *</NBText></NBText>
              </View>
              <NBText variant="body-sm" style={styles.sectionSubtitle}>Pilih petugas yang ditugaskan</NBText>
            </NBCardHeader>
            <NBCardContent>
              {needsAreaSelection ? (
                <View style={styles.emptyContainer}>
                  <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
                    Pilih lokasi terlebih dahulu
                  </NBText>
                </View>
              ) : isLoadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" color="gray600" style={styles.loadingText}>Memuat daftar petugas...</NBText>
                </View>
              ) : assigneeOptions.length > 0 ? (
                <NBSelect
                  label="Petugas"
                  value={form.assignedTo}
                  onValueChange={(userId) =>
                    setForm((prev) => ({
                      ...prev,
                      assignedTo: userId,
                      taggedUserIds: prev.taggedUserIds.filter((id) => id !== userId),
                    }))
                  }
                  options={assigneeOptions}
                  placeholder="Pilih petugas..."
                  searchable
                  searchPlaceholder="Cari nama petugas..."
                  clearable
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
                    Tidak ada petugas yang dapat ditugaskan di area ini
                  </NBText>
                </View>
              )}
              {errors.assignedTo && (
                <NBText variant="body-sm" style={styles.errorText}>{errors.assignedTo}</NBText>
              )}
            </NBCardContent>
          </NBCard>

          {/* Tagged Users (optional, multi-select with search) */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="tag-multiple-outline" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> TAG PETUGAS</NBText>
              </View>
              <NBText variant="body-sm" style={styles.sectionSubtitle}>Opsional — pilih beberapa petugas untuk di-tag</NBText>
            </NBCardHeader>
            <NBCardContent>
              {needsAreaSelection ? (
                <View style={styles.emptyContainer}>
                  <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
                    Pilih lokasi terlebih dahulu
                  </NBText>
                </View>
              ) : isLoadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={nbColors.primary} />
                  <NBText variant="body-sm" color="gray600" style={styles.loadingText}>Memuat daftar petugas...</NBText>
                </View>
              ) : taggableOptions.length > 0 ? (
                <NBSelect
                  label="Tag Petugas"
                  selectedValues={form.taggedUserIds}
                  onValuesChange={handleTaggedUsersChange}
                  options={taggableOptions}
                  placeholder="Pilih petugas untuk di-tag..."
                  searchable
                  searchPlaceholder="Cari nama petugas..."
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
                    {form.assignedTo
                      ? 'Tidak ada petugas lain untuk di-tag'
                      : 'Tidak ada petugas yang dapat di-tag di area ini'}
                  </NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>
        </ScrollView>

        {/* Fixed FAB buttons — matching ActivitySubmissionScreen pattern */}
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
                title={isSubmitting ? 'Membuat...' : 'Buat Tugas'}
                onPress={handleSubmit}
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
};

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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  sectionTitleStyle: {},
  sectionSubtitle: {},
  fieldSpacer: {
    height: nbSpacing.sm,
  },
  fieldLabel: {
    fontWeight: '600',
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  descriptionInput: {
    minHeight: 140,
  },
  optionButton: {
    padding: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.white,
  },
  optionButtonActive: {
    borderColor: nbColors.primary,
    backgroundColor: withAlpha(nbColors.primary, 0.1),
    ...nbShadows.sm,
  },
  optionText: {
    color: nbColors.black,
    textAlign: 'left',
  },
  optionTextActive: {
    color: nbColors.primary,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: nbSpacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  loadingText: {
    marginLeft: nbSpacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: nbSpacing.lg,
  },
  emptyText: {},
  errorText: {
    color: nbColors.danger,
    fontWeight: '600',
    marginBottom: nbSpacing.sm,
  },
  requiredAsterisk: {
    color: nbColors.danger,
    fontWeight: '700',
  },
  errorSummary: {
    backgroundColor: withAlpha(nbColors.danger, 0.06),
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.danger,
    borderRadius: nbRadius.sm,
    padding: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  errorSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  errorSummaryTitle: {
    color: nbColors.danger,
  },
  errorSummaryItem: {
    color: nbColors.danger,
    marginTop: 2,
  },
});
