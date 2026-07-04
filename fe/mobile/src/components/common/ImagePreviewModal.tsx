/**
 * ImagePreviewModal
 * Reusable full-screen image preview component with Neo Brutalism header.
 * Tapping the dark backdrop or the X button dismisses the modal.
 */

import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBText } from '../nb/NBText';
import { nbSpacing } from '../../constants/nbTokens';

const SCREEN = Dimensions.get('screen');

export interface ImagePreviewModalProps {
  uri: string | null;
  onClose: () => void;
  title?: string;
}

export function ImagePreviewModal({
  uri,
  onClose,
  title,
}: ImagePreviewModalProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dark backdrop — tapping it closes the modal */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel={t('common:ui.closeImagePreview')}
        accessibilityRole="button"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top bar */}
          <View style={styles.topBar}>
            {title ? (
              <NBText variant="body" color="white" style={styles.titleFlex} numberOfLines={1}>
                {title}
              </NBText>
            ) : (
              <View style={styles.titlePlaceholder} />
            )}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.close')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <NBText variant="h3" color="white">✕</NBText>
            </TouchableOpacity>
          </View>

          {/* Image area — separate TouchableOpacity prevents backdrop tap-through */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {/* no-op: absorb taps so backdrop doesn't close */}}
            style={styles.imageWrapper}
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : null}
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Semi-transparent dark overlay — rgba cannot be expressed as a plain token
    // (nbColors.bgOverlay is rgba(0,0,0,0.5); this overlay uses 0.8 opacity)
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: 12,
  },
  titleFlex: {
    flex: 1,
    marginRight: 12,
  },
  titlePlaceholder: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN.width,
    height: SCREEN.height - 70, // subtract topBar height
  },
});
