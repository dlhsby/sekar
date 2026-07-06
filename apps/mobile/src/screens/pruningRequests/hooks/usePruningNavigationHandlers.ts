/**
 * usePruningNavigationHandlers — Leave confirmation (save draft or discard).
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import i18n from '../../../i18n/config';

interface UsePruningNavigationHandlersProps {
  navigation: any;
  hasContent: () => boolean;
  clearDraft: () => Promise<void>;
  resetForm: () => void;
}

export function usePruningNavigationHandlers({
  navigation,
  hasContent,
  clearDraft,
  resetForm,
}: UsePruningNavigationHandlersProps) {
  const handleLeave = useCallback(() => {
    if (!hasContent()) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      i18n.t('pruning:actions.cancel.confirm'),
      i18n.t('pruning:actions.cancel.question'),
      [
        {
          text: i18n.t('pruning:actions.cancel.no'),
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            resetForm();
            navigation.goBack();
          },
        },
        {
          text: i18n.t('pruning:actions.cancel.yes'),
          onPress: async () => {
            resetForm();
            navigation.goBack();
          },
        },
      ],
    );
  }, [hasContent, clearDraft, resetForm, navigation]);

  return { handleLeave };
}
