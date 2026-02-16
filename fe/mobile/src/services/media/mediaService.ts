/**
 * Media Service
 * Handles photo capture, gallery selection, compression, and Base64 conversion
 * For work report submissions with optimized file sizes
 */

import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type Asset,
} from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';
import uuid from 'react-native-uuid';

/**
 * Photo object with file info
 */
export interface Photo {
  id: string;
  uri: string;
  fileName: string;
  fileSize: number;
  type: string;
  width?: number;
  height?: number;
}

/**
 * Compressed photo result
 */
interface CompressedPhoto {
  uri: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Photo configuration
 */
const PHOTO_CONFIG = {
  maxOriginalSize: 10 * 1024 * 1024, // 10MB max before compression (match backend limit)
  targetSize: 1 * 1024 * 1024, // 1MB target after compression
  maxWidth: 1200, // Max dimensions for better quality
  maxHeight: 1200,
  initialQuality: 80, // Start quality (0-100)
  minQuality: 30, // Minimum quality
  format: 'JPEG' as const,
  maxPhotos: 5, // Max photos per report
  maxCompressionIterations: 5, // Max attempts to reach target size
};

/**
 * Media Service Class
 * Provides photo capture, compression, and conversion utilities
 */
class MediaService {
  /**
   * Track temporary files for cleanup
   */
  private tempFiles: Set<string> = new Set();
  /**
   * Capture photo from camera
   * Opens front or back camera and returns compressed photo
   */
  async capturePhoto(useFrontCamera = false): Promise<Photo | null> {
    try {
      const result: ImagePickerResponse = await launchCamera({
        mediaType: 'photo',
        quality: 1, // Start with high quality, compress later
        maxWidth: 2048,
        maxHeight: 2048,
        cameraType: useFrontCamera ? 'front' : 'back',
        saveToPhotos: false,
        includeBase64: false,
      });

      if (result.didCancel) {
        return null;
      }

      if (result.errorCode) {
        throw new Error(this.getErrorMessage(result.errorCode));
      }

      if (!result.assets || result.assets.length === 0) {
        throw new Error('Tidak ada foto yang diambil');
      }

      const asset = result.assets[0];
      return await this.processAsset(asset);
    } catch (error) {
      throw new Error(`Kesalahan kamera: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`);
    }
  }

  /**
   * Pick photos from gallery
   * Allows multiple selection up to maxPhotos limit
   */
  async pickFromGallery(maxPhotos = PHOTO_CONFIG.maxPhotos): Promise<Photo[]> {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        maxWidth: 2048,
        maxHeight: 2048,
        selectionLimit: maxPhotos,
        includeBase64: false,
      });

      if (result.didCancel) {
        return [];
      }

      if (result.errorCode) {
        throw new Error(this.getErrorMessage(result.errorCode));
      }

      if (!result.assets || result.assets.length === 0) {
        return [];
      }

      // Process all selected photos
      const photos: Photo[] = [];
      for (const asset of result.assets) {
        const photo = await this.processAsset(asset);
        if (photo) {
          photos.push(photo);
        }
      }

      return photos;
    } catch (error) {
      throw new Error(`Kesalahan galeri: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`);
    }
  }

  /**
   * Process a single photo asset
   * Validates size, compresses, and returns Photo object
   */
  private async processAsset(asset: Asset): Promise<Photo | null> {
    if (!asset.uri) {
      return null;
    }

    // Check original file size
    if (asset.fileSize && asset.fileSize > PHOTO_CONFIG.maxOriginalSize) {
      throw new Error(`Foto terlalu besar (maks ${PHOTO_CONFIG.maxOriginalSize / 1024 / 1024}MB). Pilih foto yang lebih kecil.`);
    }

    // Compress photo
    const compressed = await this.compressPhoto(asset.uri);

    // Create Photo object
    const photo: Photo = {
      id: uuid.v4() as string,
      uri: compressed.uri,
      fileName: compressed.name,
      fileSize: compressed.size,
      type: 'image/jpeg',
      width: compressed.width,
      height: compressed.height,
    };

    return photo;
  }

  /**
   * Check available disk space
   * Requires minimum 50MB free space for compression operations
   */
  private async checkDiskSpace(): Promise<void> {
    try {
      const freeSpace = await RNFS.getFSInfo();
      const minRequiredSpace = 50 * 1024 * 1024; // 50MB in bytes

      if (freeSpace.freeSpace < minRequiredSpace) {
        throw new Error('Penyimpanan penuh. Bebaskan minimal 50MB dan coba lagi.');
      }
    } catch (error: any) {
      // If error message is already localized, rethrow it
      if (error.message?.includes('Penyimpanan penuh')) {
        throw error;
      }
      // Otherwise throw generic storage check error
      throw new Error('Gagal memeriksa ruang penyimpanan');
    }
  }

  /**
   * Compress photo to target size
   * Uses iterative quality reduction to reach target file size
   */
  async compressPhoto(uri: string): Promise<CompressedPhoto> {
    try {
      // Check disk space before compression
      await this.checkDiskSpace();

      let quality = PHOTO_CONFIG.initialQuality;
      let compressed = await ImageResizer.createResizedImage(
        uri,
        PHOTO_CONFIG.maxWidth,
        PHOTO_CONFIG.maxHeight,
        PHOTO_CONFIG.format,
        quality,
        0, // rotation
        undefined, // output path
        false, // keep metadata
      );

      // Track temp file for cleanup
      this.tempFiles.add(compressed.uri);

      // Check size and reduce quality if needed
      let stats = await RNFS.stat(compressed.uri);
      let iterations = 0;

      while (
        stats.size > PHOTO_CONFIG.targetSize &&
        quality > PHOTO_CONFIG.minQuality &&
        iterations < PHOTO_CONFIG.maxCompressionIterations
      ) {
        quality -= 10;
        iterations++;

        // Delete previous attempt
        try {
          await RNFS.unlink(compressed.uri);
          this.tempFiles.delete(compressed.uri);
        } catch (unlinkError: any) {
          // Check for disk full error
          if (unlinkError?.code === 'ENOSPC') {
            throw new Error('Penyimpanan penuh. Bebaskan ruang dan coba lagi.');
          }
          console.warn('Failed to delete temp file:', unlinkError);
        }

        // Try again with lower quality
        compressed = await ImageResizer.createResizedImage(
          uri,
          PHOTO_CONFIG.maxWidth,
          PHOTO_CONFIG.maxHeight,
          PHOTO_CONFIG.format,
          quality,
          0,
          undefined,
          false,
        );

        // Track new temp file
        this.tempFiles.add(compressed.uri);
        stats = await RNFS.stat(compressed.uri);
      }

      return {
        uri: compressed.uri,
        name: compressed.name || `photo_${Date.now()}.jpg`,
        size: stats.size,
        width: compressed.width || PHOTO_CONFIG.maxWidth,
        height: compressed.height || PHOTO_CONFIG.maxHeight,
      };
    } catch (error: any) {
      // Handle disk full error specifically
      if (error?.code === 'ENOSPC' || error?.message?.includes('ENOSPC')) {
        throw new Error('Penyimpanan penuh. Bebaskan ruang dan coba lagi.');
      }
      // Rethrow localized errors as-is
      if (error?.message?.includes('Penyimpanan penuh')) {
        throw error;
      }
      throw new Error(`Kompresi gagal: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`);
    }
  }

  /**
   * Convert photo to Base64 string
   * For API upload or inline display
   */
  async convertToBase64(photo: Photo): Promise<string> {
    try {
      const base64 = await RNFS.readFile(photo.uri, 'base64');
      return `data:${photo.type};base64,${base64}`;
    } catch (error) {
      throw new Error(`Konversi Base64 gagal: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`);
    }
  }

  /**
   * Get photo file info
   * Returns file size, dimensions, etc.
   */
  async getPhotoInfo(uri: string): Promise<{ size: number; exists: boolean }> {
    try {
      const stats = await RNFS.stat(uri);
      return {
        size: stats.size,
        exists: stats.isFile(),
      };
    } catch (error) {
      return {
        size: 0,
        exists: false,
      };
    }
  }

  /**
   * Delete photo from filesystem
   * Cleanup temporary files
   */
  async deletePhoto(uri: string): Promise<void> {
    try {
      const exists = await RNFS.exists(uri);
      if (exists) {
        await RNFS.unlink(uri);
        this.tempFiles.delete(uri);
      }
    } catch (error) {
      console.warn('Failed to delete photo:', error);
      // Don't throw - cleanup errors are non-critical
    }
  }

  /**
   * Cleanup all tracked temporary files
   * Call this periodically or when app goes to background
   */
  async cleanupTempFiles(): Promise<void> {
    console.debug(`[MediaService] Cleaning up ${this.tempFiles.size} temp files`);

    const filesToDelete = Array.from(this.tempFiles);
    let successCount = 0;
    let failCount = 0;

    for (const uri of filesToDelete) {
      try {
        const exists = await RNFS.exists(uri);
        if (exists) {
          await RNFS.unlink(uri);
          successCount++;
        }
        this.tempFiles.delete(uri);
      } catch (error: any) {
        failCount++;
        if (error?.code === 'ENOSPC') {
          console.error('[MediaService] Disk full error during cleanup');
        } else {
          console.warn('[MediaService] Failed to delete temp file:', uri, error);
        }
      }
    }

    console.debug(`[MediaService] Cleanup complete - ${successCount} deleted, ${failCount} failed`);
  }

  /**
   * Validate photo count
   */
  validatePhotoCount(currentCount: number): boolean {
    return currentCount < PHOTO_CONFIG.maxPhotos;
  }

  /**
   * Get max photos allowed
   */
  getMaxPhotos(): number {
    return PHOTO_CONFIG.maxPhotos;
  }

  /**
   * Get user-friendly error message in Indonesian
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'camera_unavailable':
        return 'Kamera tidak tersedia di perangkat ini';
      case 'permission':
        return 'Izin kamera/galeri ditolak. Aktifkan di Pengaturan.';
      case 'others':
        return 'Terjadi kesalahan saat mengakses kamera/galeri';
      default:
        return `Kesalahan: ${errorCode}`;
    }
  }
}

// Export singleton instance
export const mediaService = new MediaService();

// Export class for testing
export default MediaService;
