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
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { nbTypography } from '../../constants/nbTokens';

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
        accessibilityLabel="Tutup pratinjau gambar"
        accessibilityRole="button"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top bar */}
          <View style={styles.topBar}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <View style={styles.titlePlaceholder} />
            )}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeText}>✕</Text>
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
    backgroundColor: '#000000CC',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
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
  closeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: nbTypography.fontWeight.bold,
    lineHeight: 26,
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
