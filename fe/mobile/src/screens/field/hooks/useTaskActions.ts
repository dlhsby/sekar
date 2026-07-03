/**
 * useTaskActions Hook
 * Manages all task action handlers (accept, decline, start, verify, revision, delegate, assign)
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '../../../i18n/config';
import * as tasksApi from '../../../services/api/tasksApi';
import type { Task } from '../../../types/models.types';
import type { MainTabScreenProps } from '../../../types/navigation.types';

type TaskDetailNavigationProp = MainTabScreenProps<'TaskDetail'>['navigation'];

export interface UseTaskActionsReturn {
  isSubmitting: boolean;
  showDeclineInput: boolean;
  declineReason: string;
  showRevisionInput: boolean;
  revisionReason: string;
  showAssignInput: boolean;
  assigneeId: string;
  setShowDeclineInput: (show: boolean) => void;
  setDeclineReason: (reason: string) => void;
  setShowRevisionInput: (show: boolean) => void;
  setRevisionReason: (reason: string) => void;
  setShowAssignInput: (show: boolean) => void;
  setAssigneeId: (id: string) => void;
  handleAccept: () => Promise<void>;
  handleDecline: () => void;
  handleDeclineSubmit: () => Promise<void>;
  handleStart: () => Promise<void>;
  handleComplete: () => void;
  handleVerify: () => void;
  handleRevision: () => void;
  handleRevisionSubmit: () => Promise<void>;
  handleAssignSubmit: () => Promise<void>;
}

export function useTaskActions(
  task: Task | null,
  onTaskUpdated: () => Promise<void>,
): UseTaskActionsReturn {
  const navigation = useNavigation<TaskDetailNavigationProp>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [showAssignInput, setShowAssignInput] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');

  const handleAccept = useCallback(async () => {
    if (!task) { return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.acceptTask(task.id);
      if (response.error) { Alert.alert('Error', response.error); return; }
      Alert.alert(i18n.t('tasks:actions.accept.success'), i18n.t('tasks:actions.accept.successMessage'));
      await onTaskUpdated();
    } catch {
      Alert.alert('Error', i18n.t('tasks:actions.accept.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [task, onTaskUpdated]);

  const handleDecline = useCallback(() => {
    setShowDeclineInput(true);
  }, []);

  const handleDeclineSubmit = useCallback(async () => {
    if (!task) { return; }
    if (!declineReason.trim()) { Alert.alert('Error', i18n.t('tasks:actions.decline.reasonRequired')); return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.declineTask(task.id, { reason: declineReason.trim() });
      if (response.error) { Alert.alert('Error', response.error); return; }
      Alert.alert(i18n.t('tasks:actions.decline.success'), i18n.t('tasks:actions.decline.successMessage'));
      setShowDeclineInput(false);
      setDeclineReason('');
      await onTaskUpdated();
    } catch {
      Alert.alert('Error', i18n.t('tasks:actions.decline.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [task, declineReason, onTaskUpdated]);

  const handleStart = useCallback(async () => {
    if (!task) { return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.startTask(task.id);
      if (response.error) { Alert.alert('Error', response.error); return; }
      Alert.alert(i18n.t('tasks:actions.start.success'), i18n.t('tasks:actions.start.successMessage'));
      await onTaskUpdated();
    } catch {
      Alert.alert('Error', i18n.t('tasks:actions.start.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [task, onTaskUpdated]);

  const handleComplete = useCallback(() => {
    if (!task) { return; }
    navigation.navigate('TaskComplete', { taskId: task.id });
  }, [task, navigation]);

  const handleVerify = useCallback(() => {
    if (!task) { return; }
    Alert.alert(
      i18n.t('tasks:actions.verify.confirm'),
      i18n.t('tasks:actions.verify.question'),
      [
        { text: i18n.t('tasks:actions.verify.cancel'), style: 'cancel' },
        {
          text: i18n.t('tasks:actions.verify.yes'),
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await tasksApi.verifyTask(task.id);
              if (response.error) { Alert.alert('Error', response.error); return; }
              Alert.alert(i18n.t('tasks:actions.verify.success'), i18n.t('tasks:actions.verify.successMessage'));
              await onTaskUpdated();
            } catch {
              Alert.alert('Error', i18n.t('tasks:actions.verify.error'));
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }, [task, onTaskUpdated]);

  const handleRevision = useCallback(() => {
    setShowRevisionInput(true);
  }, []);

  const handleRevisionSubmit = useCallback(async () => {
    if (!task) { return; }
    if (!revisionReason.trim()) { Alert.alert('Error', i18n.t('tasks:actions.revision.reasonRequired')); return; }
    Alert.alert(
      i18n.t('tasks:actions.revision.confirm'),
      i18n.t('tasks:actions.revision.question'),
      [
        { text: i18n.t('tasks:actions.revision.cancel'), style: 'cancel' },
        {
          text: i18n.t('tasks:actions.revision.yes'),
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await tasksApi.requestRevision(task.id, { reason: revisionReason.trim() });
              if (response.error) { Alert.alert('Error', response.error); return; }
              Alert.alert(i18n.t('tasks:actions.revision.success'), i18n.t('tasks:actions.revision.successMessage'));
              setShowRevisionInput(false);
              setRevisionReason('');
              await onTaskUpdated();
            } catch {
              Alert.alert('Error', i18n.t('tasks:actions.revision.error'));
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }, [task, revisionReason, onTaskUpdated]);

  const handleAssignSubmit = useCallback(async () => {
    if (!task || !assigneeId) { return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.assignTask(task.id, { assigned_to: assigneeId });
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      setShowAssignInput(false);
      setAssigneeId('');
      Alert.alert(i18n.t('tasks:actions.assign.success'), i18n.t('tasks:actions.assign.successMessage'));
      await onTaskUpdated();
    } catch {
      Alert.alert('Error', i18n.t('tasks:actions.assign.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [task, assigneeId, onTaskUpdated]);

  return {
    isSubmitting,
    showDeclineInput,
    declineReason,
    showRevisionInput,
    revisionReason,
    showAssignInput,
    assigneeId,
    setShowDeclineInput,
    setDeclineReason,
    setShowRevisionInput,
    setRevisionReason,
    setShowAssignInput,
    setAssigneeId,
    handleAccept,
    handleDecline,
    handleDeclineSubmit,
    handleStart,
    handleComplete,
    handleVerify,
    handleRevision,
    handleRevisionSubmit,
    handleAssignSubmit,
  };
}
