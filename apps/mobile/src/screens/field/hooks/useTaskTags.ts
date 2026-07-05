/**
 * useTaskTags Hook
 * Manages task tag editing state and submission
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as tasksApi from '../../../services/api/tasksApi';
import type { Task } from '../../../types/models.types';

export interface UseTaskTagsReturn {
  isEditingTags: boolean;
  tagPickerSelection: string[];
  isSavingTags: boolean;
  setIsEditingTags: (editing: boolean) => void;
  setTagPickerSelection: (selection: string[]) => void;
  handleStartEditTags: () => void;
  handleCancelEditTags: () => void;
  handleSaveTags: () => Promise<void>;
}

export function useTaskTags(
  task: Task | null,
  onTaskUpdated: () => Promise<void>,
  loadSubordinates: () => Promise<void>,
): UseTaskTagsReturn {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagPickerSelection, setTagPickerSelection] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  const handleStartEditTags = useCallback(() => {
    if (!task) { return; }
    setTagPickerSelection((task.tags ?? []).map((t) => t.user_id));
    setIsEditingTags(true);
    loadSubordinates();
  }, [task, loadSubordinates]);

  const handleCancelEditTags = useCallback(() => {
    setIsEditingTags(false);
    setTagPickerSelection([]);
  }, []);

  const handleSaveTags = useCallback(async () => {
    if (!task) { return; }
    const existingIds = new Set((task.tags ?? []).map((t) => t.user_id));
    const desiredIds = new Set(tagPickerSelection);
    const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      setIsEditingTags(false);
      return;
    }

    setIsSavingTags(true);
    try {
      // Remove first so we never exceed any per-task tag cap if one is added later.
      for (const userId of toRemove) {
        const r = await tasksApi.removeTaskTag(task.id, userId);
        if (r.error) { throw new Error(r.error); }
      }
      if (toAdd.length > 0) {
        const r = await tasksApi.addTaskTags(task.id, toAdd);
        if (r.error) { throw new Error(r.error); }
      }
      await onTaskUpdated();
      setIsEditingTags(false);
    } catch (err) {
      Alert.alert('Gagal Menyimpan Tag', (err as Error).message || 'Coba lagi.');
    } finally {
      setIsSavingTags(false);
    }
  }, [task, tagPickerSelection, onTaskUpdated]);

  return {
    isEditingTags,
    tagPickerSelection,
    isSavingTags,
    setIsEditingTags,
    setTagPickerSelection,
    handleStartEditTags,
    handleCancelEditTags,
    handleSaveTags,
  };
}
