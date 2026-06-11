/**
 * Draft persistence hook for task creation form
 * Thin adapter over generic useDraftPersistence with Alert confirmation flow
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDraftPersistence as useGenericDraftPersistence } from '../../../hooks/useDraftPersistence';
import type { FormState } from './useTaskCreateForm';

const DRAFT_KEY = 'task_create_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface Draft {
  title: string;
  description: string;
  priority: string;
  assignedTo: string;
  taggedUserIds: string[];
  timestamp: number;
}

/**
 * Hook to manage draft persistence (save, restore, clear)
 * Wraps generic hook with task-specific Alert flow
 */
export const useDraftPersistence = (
  form: FormState,
  onRestoreDraft: (draft: Partial<FormState>) => void,
) => {
  const handleRestoreDraft = useCallback((draft: Draft) => {
    Alert.alert(
      'Draft Ditemukan',
      'Anda memiliki draft tugas yang belum terkirim. Lanjutkan?',
      [
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(DRAFT_KEY);
          },
        },
        {
          text: 'Lanjutkan',
          onPress: async () => {
            await AsyncStorage.removeItem(DRAFT_KEY);
            onRestoreDraft({
              title: draft.title || '',
              description: draft.description || '',
              priority: (draft.priority as any) || 'medium',
              assignedTo: draft.assignedTo || '',
              taggedUserIds: draft.taggedUserIds || [],
            });
          },
        },
      ]
    );
  }, [onRestoreDraft]);

  const generic = useGenericDraftPersistence<Draft>(
    {
      title: form.title,
      description: form.description,
      priority: form.priority as string,
      assignedTo: form.assignedTo,
      taggedUserIds: form.taggedUserIds,
      timestamp: Date.now(),
    },
    handleRestoreDraft,
    {
      storageKey: DRAFT_KEY,
      ttlMs: DRAFT_TTL,
      autoSaveIntervalMs: AUTO_SAVE_INTERVAL,
      serialize: (d) => JSON.stringify(d),
      deserialize: (raw) => JSON.parse(raw),
      hasContent: (formRef) => {
        const f = formRef.current;
        return f.title.length > 0 || f.description.length > 0;
      },
    }
  );

  return {
    saveDraft: generic.saveDraft,
    clearDraft: generic.clearDraft,
    restoreDraft: generic.restoreDraft,
    formRef: generic.formRef,
    saveDraftRef: generic.saveDraftRef,
  };
};
