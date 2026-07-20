/**
 * Task Create Screen
 * Phase 2C: Create new task with hierarchical assignment validation
 * Access: TASK_CREATORS roles only (korlap, kepala_rayon, management, admin_system, superadmin)
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppSelector } from '../../store/hooks';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { createTask } from '../../services/api/tasksApi';
import {
  NBButton,
  NBText,
  NBBackgroundPattern,
  NBToast,
} from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import { nbColors } from '../../constants/nbTokens';
import type { CreateTaskRequest } from '../../types/api.types';
import type { TaskPriority, UserRole } from '../../types/models.types';
import { useTaskCreateForm, useDraftPersistence, useLocationFetching, useAssignableUsersFetching } from './hooks';
import { TaskDetailSection } from './components/TaskDetailSection';
import { LocationSection } from './components/LocationSection';
import { PrioritySection } from './components/PrioritySection';
import { DeadlineSection } from './components/DeadlineSection';
import { AssigneeSection } from './components/AssigneeSection';
import { TaggedUsersSection } from './components/TaggedUsersSection';
import { styles } from './styles';

/** Roles where district is fixed from user profile */
const RAYON_FIXED_ROLES: UserRole[] = ['korlap', 'kepala_rayon'];

/** Roles where area is fixed from user profile */
const AREA_FIXED_ROLES: UserRole[] = ['korlap'];

/**
 * Task Create Screen Component
 */
export const TaskCreateScreen: React.FC<MainTabScreenProps<'TaskCreate'>> = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MainTabScreenProps<'TaskCreate'>['navigation']>();
  const { role, canCreateTask } = useRoleAccess();
  const user = useAppSelector((state) => state.auth.user);
  const scrollViewRef = useRef<ScrollView>(null);

  const { form, setForm, errors, validateForm, resetForm, updateField, clearAssigneeAndTagged } = useTaskCreateForm(
    user?.location_id,
    user?.district_id,
  );

  const { clearDraft, restoreDraft, formRef, saveDraftRef } = useDraftPersistence(
    form,
    (draft) => {
      setForm((prev) => ({ ...prev, ...draft }));
    },
  );

  const isDistrictFixed = role ? RAYON_FIXED_ROLES.includes(role as UserRole) : false;
  const isAreaFixed = role ? AREA_FIXED_ROLES.includes(role as UserRole) : false;

  const { isLoadingDistricts, isLoadingAreas, districtOptions, areaOptions } = useLocationFetching(
    form.districtId,
    isDistrictFixed,
    isAreaFixed,
  );

  const { isLoadingUsers, assignableUsers, prevAreaIdRef } = useAssignableUsersFetching(
    role as UserRole | null,
    form.areaId,
    form.districtId,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft on every screen focus
  useFocusEffect(
    useCallback(() => {
      restoreDraft();
    }, [restoreDraft]),
  );

  // Clear assignee/tagged when area changes
  useEffect(() => {
    if (prevAreaIdRef.current !== form.areaId) {
      prevAreaIdRef.current = form.areaId;
      clearAssigneeAndTagged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prevAreaIdRef is mutated, not dependency tracked
  }, [form.areaId, clearAssigneeAndTagged]);

  // Initialize district/area from user profile and check access
  useEffect(() => {
    if (!user || !role) return;
    if (isDistrictFixed && user.district_id) {
      updateField('districtId', user.district_id);
    }
    if (isAreaFixed && user.location_id) {
      updateField('areaId', user.location_id);
    }
  }, [user, role, isDistrictFixed, isAreaFixed, updateField]);

  useEffect(() => {
    if (!canCreateTask) {
      NBToast.show({ level: 'danger', title: t('tasks:create.accessDenied'), body: t('tasks:create.accessDeniedMessage') });
      (navigation as any).navigate('Tasks');
    }
  }, [canCreateTask, navigation, t]);

  const needsAreaSelection = !isAreaFixed && !form.areaId;

  const handleLeave = useCallback(() => {
    const hasContent = formRef.current.title.trim().length > 0 || formRef.current.description.trim().length > 0;
    if (!hasContent) {
      resetForm();
      (navigation as any).navigate('Tasks');
      return;
    }
    Alert.alert(
      t('tasks:create.cancelConfirm'),
      t('tasks:create.cancelConfirm'),
      [
        {
          text: t('tasks:create.cancelNo'),
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            resetForm();
            (navigation as any).navigate('Tasks');
          },
        },
        {
          text: t('tasks:create.cancelYes'),
          onPress: async () => {
            await saveDraftRef.current?.();
            resetForm();
            (navigation as any).navigate('Tasks');
          },
        },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formRef is mutated, not dependency tracked
  }, [navigation, resetForm, clearDraft, saveDraftRef]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader title={t('tasks:create.title')} onBack={handleLeave} />
      ),
    });
  }, [navigation, handleLeave, t]);

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
        location_id: form.areaId || undefined,
        district_id: form.districtId || undefined,
        assigned_to: form.assignedTo || undefined,
        tagged_user_ids: form.taggedUserIds.length > 0 ? form.taggedUserIds : undefined,
      };
      if (form.description.trim()) {
        request.description = form.description.trim();
      }
      const response = await createTask(request);
      if (response.data) {
        await clearDraft();
        resetForm();
        NBToast.show({ level: 'success', title: t('tasks:create.successTitle'), body: t('tasks:create.successMessage') });
        (navigation as any).navigate('Tasks');
      } else if (response.error) {
        NBToast.show({ level: 'danger', title: t('tasks:create.failureTitle'), body: response.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('tasks:create.failureMessage');
      NBToast.show({ level: 'danger', title: t('tasks:create.failureTitle'), body: message });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validateForm, navigation, clearDraft, resetForm]);

  const handleTaggedUsersChange = useCallback((values: string[]) => {
    setForm((prev) => ({
      ...prev,
      taggedUserIds: values,
      assignedTo: values.includes(prev.assignedTo) ? '' : prev.assignedTo,
    }));
  }, [setForm]);

  const handleDistrictChange = useCallback((districtId: string) => {
    setForm((prev) => ({ ...prev, districtId, areaId: '' }));
  }, [setForm]);

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
                <NBText variant="body-sm" style={styles.errorSummaryTitle}>
                  {' '}
                  {t('activities:submission.errorSummary')}
                </NBText>
              </View>
              {Object.values(errors)
                .filter(Boolean)
                .map((msg, i) => (
                  <NBText key={i} variant="body-sm" style={styles.errorSummaryItem}>
                    • {msg}
                  </NBText>
                ))}
            </View>
          )}

          <TaskDetailSection
            title={form.title}
            onTitleChange={(text) => updateField('title', text)}
            titleError={errors.title}
            description={form.description}
            onDescriptionChange={(text) => updateField('description', text)}
          />

          <LocationSection
            districtId={form.districtId}
            onDistrictChange={handleDistrictChange}
            isDistrictFixed={isDistrictFixed}
            isLoadingDistricts={isLoadingDistricts}
            districtOptions={districtOptions}
            userDistrictId={user?.district_id}
            userDistrictName={user?.district?.name}
            areaId={form.areaId}
            onAreaChange={(areaId) => updateField('areaId', areaId)}
            isAreaFixed={isAreaFixed}
            isLoadingAreas={isLoadingAreas}
            areaOptions={areaOptions}
            userAreaId={user?.location_id}
            userAreaName={user?.area?.name}
          />

          <PrioritySection
            priority={form.priority}
            onPriorityChange={(priority) => updateField('priority', priority)}
          />

          <DeadlineSection
            deadline={form.deadline}
            onDeadlineChange={(date) => updateField('deadline', date)}
            onDeadlineClear={() => updateField('deadline', null)}
          />

          <AssigneeSection
            assignedTo={form.assignedTo}
            onAssigneeChange={(userId) =>
              setForm((prev) => ({
                ...prev,
                assignedTo: userId,
                taggedUserIds: prev.taggedUserIds.filter((id) => id !== userId),
              }))
            }
            assigneeError={errors.assignedTo}
            needsAreaSelection={needsAreaSelection}
            isLoadingUsers={isLoadingUsers}
            assignableUsers={assignableUsers}
            taggedUserIds={form.taggedUserIds}
          />

          <TaggedUsersSection
            taggedUserIds={form.taggedUserIds}
            onTaggedUsersChange={handleTaggedUsersChange}
            needsAreaSelection={needsAreaSelection}
            isLoadingUsers={isLoadingUsers}
            assignableUsers={assignableUsers}
            assignedTo={form.assignedTo}
          />
        </ScrollView>

        <View style={styles.fab}>
          <View style={styles.fabButtonRow}>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title={t('tasks:actionButtons.cancel')}
                variant="secondary"
                onPress={handleLeave}
                disabled={isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title={isSubmitting ? `${t('common:status.loading')}...` : t('tasks:create.title')}
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
