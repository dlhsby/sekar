/**
 * Draft persistence hook for task creation form
 */

import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
 */
export const useDraftPersistence = (
  form: FormState,
  onRestoreDraft: (draft: Partial<FormState>) => void,
) => {
  const formRef = useRef<FormState>(form);
  const saveDraftRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const saveDraft = useCallback(async () => {
    try {
      const draft: Draft = {
        title: form.title,
        description: form.description,
        priority: form.priority as string,
        assignedTo: form.assignedTo,
        taggedUserIds: form.taggedUserIds,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Silently fail
    }
  }, [form]);

  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem(DRAFT_KEY);
  }, []);

  const restoreDraft = useCallback(async () => {
    try {
      const draftStr = await AsyncStorage.getItem(DRAFT_KEY);
      if (!draftStr) return;
      const draft = JSON.parse(draftStr) as Draft;
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
      } else {
        await AsyncStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Silently fail
    }
  }, [onRestoreDraft]);

  // Auto-save draft every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const f = formRef.current;
      if (f.title.length > 0 || f.description.length > 0) {
        saveDraftRef.current?.();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return {
    saveDraft,
    clearDraft,
    restoreDraft,
    formRef,
    saveDraftRef,
  };
};
