/**
 * Form state and validation hook for task creation
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskPriority } from '../../../types/models.types';

/**
 * Form state interface
 */
export interface FormState {
  title: string;
  description: string;
  priority: TaskPriority | '';
  deadline: Date | null;
  areaId: string;
  districtId: string;
  assignedTo: string;
  taggedUserIds: string[];
}

/**
 * Form errors interface
 */
export interface FormErrors {
  title?: string;
  assignedTo?: string;
}

const INITIAL_FORM_STATE: FormState = {
  title: '',
  description: '',
  priority: 'medium',
  deadline: null,
  areaId: '',
  districtId: '',
  assignedTo: '',
  taggedUserIds: [],
};

/**
 * Hook to manage task creation form state and validation
 */
export const useTaskCreateForm = (userAreaId?: string, userDistrictId?: string) => {
  const { t } = useTranslation('validation');
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM_STATE,
    areaId: userAreaId || '',
    districtId: userDistrictId || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = t('taskTitleRequired');
    }

    if (!form.assignedTo) {
      newErrors.assignedTo = t('taskAssigneeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, t]);

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_FORM_STATE,
      areaId: userAreaId || '',
      districtId: userDistrictId || '',
    });
    setErrors({});
  }, [userAreaId, userDistrictId]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAssigneeAndTagged = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      assignedTo: '',
      taggedUserIds: [],
    }));
  }, []);

  return {
    form,
    setForm,
    errors,
    setErrors,
    validateForm,
    resetForm,
    updateField,
    clearAssigneeAndTagged,
  };
};
