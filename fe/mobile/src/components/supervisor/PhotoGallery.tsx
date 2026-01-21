/**
 * Photo Gallery Component
 * Displays a horizontal scrollable gallery of photos with fullscreen modal
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface PhotoGalleryProps {
  photos: string[];
  testID?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const THUMBNAIL_SIZE = 100;

/**
 * Photo Gallery Component
 * Horizontal scrollable gallery with tap to fullscreen
 */
export function PhotoGallery({ photos, testID }: PhotoGalleryProps): JSX.Element {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handlePhotoPress = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPhoto(null);
    setImageLoading(false);
  };

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Text style={styles.emptyText}>Tidak ada foto</Text>
      </View>
    );
  }

  return (
    <View testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={`${photo}-${index}`}
            onPress={() => handlePhotoPress(photo)}
            style={styles.thumbnailContainer}
            testID={`${testID}-thumbnail-${index}`}>
            <Image
              source={{ uri: photo }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
        testID={`${testID}-modal`}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={handleCloseModal}
            testID={`${testID}-modal-background`}>
            <View style={styles.imageContainer}>
              {imageLoading && (
                <ActivityIndicator
                  size="large"
                  color={colors.white}
                  style={styles.loader}
                />
              )}
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseModal}
            testID={`${testID}-close-button`}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.sm,
  },
  thumbnailContainer: {
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loader: {
    position: 'absolute',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default PhotoGallery;
