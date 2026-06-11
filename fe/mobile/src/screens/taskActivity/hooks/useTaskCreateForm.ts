/**
 * Form state and validation hook for task creation
 */

import { useState, useCallback } from 'react';
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
  rayonId: string;
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
  rayonId: '',
  assignedTo: '',
  taggedUserIds: [],
};

/**
 * Hook to manage task creation form state and validation
 */
export const useTaskCreateForm = (userAreaId?: string, userRayonId?: string) => {
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM_STATE,
    areaId: userAreaId || '',
    rayonId: userRayonId || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

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

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_FORM_STATE,
      areaId: userAreaId || '',
      rayonId: userRayonId || '',
    });
    setErrors({});
  }, [userAreaId, userRayonId]);

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
