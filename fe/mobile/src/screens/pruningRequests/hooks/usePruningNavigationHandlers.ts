/**
 * usePruningNavigationHandlers — Leave confirmation (save draft or discard).
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';

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
      'Simpan Draft?',
      'Anda memiliki perubahan yang belum dikirim.',
      [
        {
          text: 'Tidak',
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            resetForm();
            navigation.goBack();
          },
        },
        {
          text: 'Ya',
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
