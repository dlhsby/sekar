/**
 * Media Service Tests
 */

import MediaService, { mediaService, type Photo } from '../mediaService';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';

// Mock dependencies
jest.mock('react-native-image-picker');
jest.mock('@bam.tech/react-native-image-resizer');
jest.mock('react-native-fs');
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const mockLaunchCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;
const mockLaunchImageLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockImageResizer = ImageResizer.createResizedImage as jest.MockedFunction<typeof ImageResizer.createResizedImage>;

// Create proper mocks for RNFS
const mockStat = jest.fn();
const mockReadFile = jest.fn();
const mockUnlink = jest.fn();
const mockExists = jest.fn();
const mockGetFSInfo = jest.fn();

(RNFS as any).stat = mockStat;
(RNFS as any).readFile = mockReadFile;
(RNFS as any).unlink = mockUnlink;
(RNFS as any).exists = mockExists;
(RNFS as any).getFSInfo = mockGetFSInfo;

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock sufficient disk space by default
    mockGetFSInfo.mockResolvedValue({
      freeSpace: 100 * 1024 * 1024, // 100MB free
      totalSpace: 1000 * 1024 * 1024, // 1GB total
    });
  });

  describe('capturePhoto', () => {
    it('should capture photo from camera successfully', async () => {
      // Mock camera response
      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024, // 1MB
          },
        ],
      } as any);

      // Mock compression
      mockImageResizer.mockResolvedValue({
        uri: 'file:///path/to/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      // Mock file stat
      mockStat.mockResolvedValue({
        size: 500 * 1024, // 500KB
        isFile: () => true,
      } as any);

      const photo = await mediaService.capturePhoto(false);

      expect(photo).not.toBeNull();
      expect(photo?.id).toBe('test-uuid-1234');
      expect(photo?.type).toBe('image/jpeg');
      expect(mockLaunchCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaType: 'photo',
          cameraType: 'back',
        })
      );
    });

    it('should use front camera when specified', async () => {
      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer.mockResolvedValue({
        uri: 'file:///path/to/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      await mediaService.capturePhoto(true);

      expect(mockLaunchCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          cameraType: 'front',
        })
      );
    });

    it('should return null if user cancels', async () => {
      mockLaunchCamera.mockResolvedValue({ didCancel: true } as any);

      const photo = await mediaService.capturePhoto();

      expect(photo).toBeNull();
    });

    it('should throw error if camera fails', async () => {
      mockLaunchCamera.mockResolvedValue({
        errorCode: 'camera_unavailable',
        errorMessage: 'Camera not available',
      } as any);

      await expect(mediaService.capturePhoto()).rejects.toThrow('Kesalahan kamera');
    });

    it('should throw error if photo too large', async () => {
      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
          },
        ],
      } as any);

      await expect(mediaService.capturePhoto()).rejects.toThrow('Foto terlalu besar');
    });

    it('should throw error if no assets returned', async () => {
      mockLaunchCamera.mockResolvedValue({
        assets: [],
      } as any);

      await expect(mediaService.capturePhoto()).rejects.toThrow('Tidak ada foto yang diambil');
    });

    it('should handle permission error', async () => {
      mockLaunchCamera.mockResolvedValue({
        errorCode: 'permission',
        errorMessage: 'Permission denied',
      } as any);

      await expect(mediaService.capturePhoto()).rejects.toThrow('Izin kamera/galeri ditolak');
    });

    it('should handle others error code', async () => {
      mockLaunchCamera.mockResolvedValue({
        errorCode: 'others',
        errorMessage: 'Other error',
      } as any);

      await expect(mediaService.capturePhoto()).rejects.toThrow('Terjadi kesalahan saat mengakses kamera/galeri');
    });

    it('should handle unknown error code', async () => {
      mockLaunchCamera.mockResolvedValue({
        errorCode: 'unknown_error',
        errorMessage: 'Unknown error',
      } as any);

      await expect(mediaService.capturePhoto()).rejects.toThrow('Kesalahan: unknown_error');
    });

    it('should handle generic error', async () => {
      mockLaunchCamera.mockRejectedValue(new Error('Camera crashed'));

      await expect(mediaService.capturePhoto()).rejects.toThrow('Kesalahan kamera: Camera crashed');
    });

    it('should handle non-Error exceptions', async () => {
      mockLaunchCamera.mockRejectedValue('String error');

      await expect(mediaService.capturePhoto()).rejects.toThrow('Kesalahan kamera: Kesalahan tidak diketahui');
    });
  });

  describe('pickFromGallery', () => {
    it('should pick photos from gallery successfully', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo1.jpg',
            fileName: 'photo1.jpg',
            fileSize: 1024 * 1024,
          },
          {
            uri: 'file:///path/to/photo2.jpg',
            fileName: 'photo2.jpg',
            fileSize: 2 * 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer.mockResolvedValue({
        uri: 'file:///path/to/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      const photos = await mediaService.pickFromGallery(5);

      expect(photos).toHaveLength(2);
      expect(photos[0].id).toBeTruthy();
      expect(mockLaunchImageLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          selectionLimit: 5,
        })
      );
    });

    it('should return empty array if user cancels', async () => {
      mockLaunchImageLibrary.mockResolvedValue({ didCancel: true } as any);

      const photos = await mediaService.pickFromGallery();

      expect(photos).toEqual([]);
    });

    it('should respect maxPhotos limit', async () => {
      const maxPhotos = 3;

      mockLaunchImageLibrary.mockResolvedValue({ didCancel: true } as any);

      await mediaService.pickFromGallery(maxPhotos);

      expect(mockLaunchImageLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          selectionLimit: maxPhotos,
        })
      );
    });

    it('should return empty array if no assets returned', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        assets: [],
      } as any);

      const photos = await mediaService.pickFromGallery();

      expect(photos).toEqual([]);
    });

    it('should throw error on gallery failure', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        errorCode: 'permission',
        errorMessage: 'Permission denied',
      } as any);

      await expect(mediaService.pickFromGallery()).rejects.toThrow('Kesalahan galeri');
    });

    it('should handle generic gallery error', async () => {
      mockLaunchImageLibrary.mockRejectedValue(new Error('Gallery crashed'));

      await expect(mediaService.pickFromGallery()).rejects.toThrow('Kesalahan galeri: Gallery crashed');
    });

    it('should skip photos with no URI', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo1.jpg',
            fileName: 'photo1.jpg',
            fileSize: 1024 * 1024,
          },
          {
            // No URI
            fileName: 'photo2.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer.mockResolvedValue({
        uri: 'file:///path/to/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      const photos = await mediaService.pickFromGallery();

      // Should only return 1 photo (the one with URI)
      expect(photos).toHaveLength(1);
    });
  });

  describe('compressPhoto', () => {
    it('should compress photo to target size', async () => {
      mockImageResizer.mockResolvedValue({
        uri: 'file:///path/to/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 800 * 1024, // 800KB (under 1MB target)
        isFile: () => true,
      } as any);

      const compressed = await mediaService.compressPhoto('file:///path/to/original.jpg');

      expect(compressed.size).toBeLessThanOrEqual(1024 * 1024); // 1MB target
      expect(mockImageResizer).toHaveBeenCalledWith(
        'file:///path/to/original.jpg',
        1200,
        1200,
        'JPEG',
        80, // Updated: initialQuality is now 80 (was 70)
        0,
        undefined,
        false
      );
    });

    it('should reduce quality iteratively if file too large', async () => {
      // First compression - still too large (over 1MB target)
      mockImageResizer.mockResolvedValueOnce({
        uri: 'file:///path/to/compressed1.jpg',
        name: 'compressed1.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValueOnce({
        size: 1200 * 1024, // 1.2MB (over 1MB target)
        isFile: () => true,
      } as any);

      // Delete previous attempt
      mockUnlink.mockResolvedValueOnce(undefined as any);

      // Second compression - success (under 1MB target)
      mockImageResizer.mockResolvedValueOnce({
        uri: 'file:///path/to/compressed2.jpg',
        name: 'compressed2.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValueOnce({
        size: 900 * 1024, // 900KB (under 1MB target)
        isFile: () => true,
      } as any);

      const compressed = await mediaService.compressPhoto('file:///path/to/original.jpg');

      expect(compressed.size).toBeLessThanOrEqual(1024 * 1024); // 1MB target
      expect(mockImageResizer).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should throw error when disk space is low', async () => {
      mockGetFSInfo.mockResolvedValue({
        freeSpace: 10 * 1024 * 1024, // Only 10MB (less than 50MB required)
        totalSpace: 1000 * 1024 * 1024,
      });

      await expect(mediaService.compressPhoto('file:///path/to/photo.jpg'))
        .rejects.toThrow('Penyimpanan penuh');
    });

    it('should handle disk space check failure', async () => {
      mockGetFSInfo.mockRejectedValue(new Error('Cannot check disk space'));

      await expect(mediaService.compressPhoto('file:///path/to/photo.jpg'))
        .rejects.toThrow('Gagal memeriksa ruang penyimpanan');
    });

    it('should rethrow localized disk full error from checkDiskSpace', async () => {
      mockGetFSInfo.mockRejectedValue(
        new Error('Penyimpanan penuh. Bebaskan minimal 50MB dan coba lagi.')
      );

      await expect(mediaService.compressPhoto('file:///path/to/photo.jpg'))
        .rejects.toThrow('Penyimpanan penuh. Bebaskan minimal 50MB dan coba lagi.');
    });

    it('should handle disk full during unlink in compression loop', async () => {
      // First compression - too large
      mockImageResizer.mockResolvedValueOnce({
        uri: 'file:///path/to/compressed1.jpg',
        name: 'compressed1.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValueOnce({
        size: 1200 * 1024, // 1.2MB (over 1MB target)
        isFile: () => true,
      } as any);

      // Unlink fails with disk full
      const diskFullError = new Error('No space left');
      (diskFullError as any).code = 'ENOSPC';
      mockUnlink.mockRejectedValueOnce(diskFullError);

      await expect(mediaService.compressPhoto('file:///path/to/original.jpg'))
        .rejects.toThrow('Penyimpanan penuh. Bebaskan ruang dan coba lagi.');
    });

    it('should handle disk full error during compression', async () => {
      const diskFullError = new Error('ENOSPC: no space left');
      (diskFullError as any).code = 'ENOSPC';
      mockImageResizer.mockRejectedValue(diskFullError);

      await expect(mediaService.compressPhoto('file:///path/to/original.jpg'))
        .rejects.toThrow('Penyimpanan penuh. Bebaskan ruang dan coba lagi.');
    });

    it('should rethrow localized storage errors from compression', async () => {
      mockImageResizer.mockRejectedValue(
        new Error('Penyimpanan penuh. Bebaskan ruang dan coba lagi.')
      );

      await expect(mediaService.compressPhoto('file:///path/to/original.jpg'))
        .rejects.toThrow('Penyimpanan penuh. Bebaskan ruang dan coba lagi.');
    });

    it('should handle generic compression error', async () => {
      mockImageResizer.mockRejectedValue(new Error('Compression failed'));

      await expect(mediaService.compressPhoto('file:///path/to/original.jpg'))
        .rejects.toThrow('Kompresi gagal: Compression failed');
    });

    it('should handle non-Error compression exception', async () => {
      mockImageResizer.mockRejectedValue('String error');

      await expect(mediaService.compressPhoto('file:///path/to/original.jpg'))
        .rejects.toThrow('Kompresi gagal: Kesalahan tidak diketahui');
    });
  });

  describe('convertToBase64', () => {
    it('should convert photo to Base64 string', async () => {
      const photo: Photo = {
        id: 'test-id',
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 500 * 1024,
        type: 'image/jpeg',
      };

      mockReadFile.mockResolvedValue('base64encodedstring');

      const base64 = await mediaService.convertToBase64(photo);

      expect(base64).toBe('data:image/jpeg;base64,base64encodedstring');
      expect(mockReadFile).toHaveBeenCalledWith(photo.uri, 'base64');
    });

    it('should throw error if conversion fails', async () => {
      const photo: Photo = {
        id: 'test-id',
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 500 * 1024,
        type: 'image/jpeg',
      };

      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(mediaService.convertToBase64(photo)).rejects.toThrow('Konversi Base64 gagal');
    });
  });

  describe('getPhotoInfo', () => {
    it('should return photo info if file exists', async () => {
      mockStat.mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as any);

      const info = await mediaService.getPhotoInfo('file:///path/to/photo.jpg');

      expect(info.size).toBe(1024 * 1024);
      expect(info.exists).toBe(true);
    });

    it('should return zero size if file does not exist', async () => {
      mockStat.mockRejectedValue(new Error('File not found'));

      const info = await mediaService.getPhotoInfo('file:///path/to/nonexistent.jpg');

      expect(info.size).toBe(0);
      expect(info.exists).toBe(false);
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo if exists', async () => {
      mockExists.mockResolvedValue(true);
      mockUnlink.mockResolvedValue(undefined as any);

      await mediaService.deletePhoto('file:///path/to/photo.jpg');

      expect(mockExists).toHaveBeenCalledWith('file:///path/to/photo.jpg');
      expect(mockUnlink).toHaveBeenCalledWith('file:///path/to/photo.jpg');
    });

    it('should not throw if file does not exist', async () => {
      mockExists.mockResolvedValue(false);

      await expect(mediaService.deletePhoto('file:///path/to/nonexistent.jpg')).resolves.not.toThrow();
    });

    it('should not throw if unlink fails', async () => {
      mockExists.mockResolvedValue(true);
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      await expect(mediaService.deletePhoto('file:///path/to/photo.jpg')).resolves.not.toThrow();
    });
  });

  describe('validatePhotoCount', () => {
    it('should return true if count under limit', () => {
      expect(mediaService.validatePhotoCount(3)).toBe(true);
    });

    it('should return false if count at limit', () => {
      expect(mediaService.validatePhotoCount(5)).toBe(false);
    });

    it('should return false if count over limit', () => {
      expect(mediaService.validatePhotoCount(6)).toBe(false);
    });
  });

  describe('getMaxPhotos', () => {
    it('should return max photos allowed', () => {
      expect(mediaService.getMaxPhotos()).toBe(5);
    });
  });

  describe('cleanupTempFiles', () => {
    it('should cleanup all tracked temp files successfully', async () => {
      // Create a fresh instance to track temp files
      const service = new MediaService();

      // Mock camera to create temp files
      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      // Mock compression creates temp file
      mockImageResizer.mockResolvedValue({
        uri: 'file:///temp/compressed1.jpg',
        name: 'compressed1.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      // Capture photo (creates temp file)
      await service.capturePhoto();

      // Mock cleanup
      mockExists.mockResolvedValue(true);
      mockUnlink.mockResolvedValue(undefined as any);

      // Cleanup
      await service.cleanupTempFiles();

      expect(mockExists).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should handle cleanup when files do not exist', async () => {
      const service = new MediaService();

      // Mock camera
      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer.mockResolvedValue({
        uri: 'file:///temp/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      await service.capturePhoto();

      // File doesn't exist during cleanup
      mockExists.mockResolvedValue(false);

      await expect(service.cleanupTempFiles()).resolves.not.toThrow();
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const service = new MediaService();

      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer.mockResolvedValue({
        uri: 'file:///temp/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      await service.capturePhoto();

      // Cleanup fails
      mockExists.mockResolvedValue(true);
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(service.cleanupTempFiles()).resolves.not.toThrow();
    });

    it('should handle disk full error during cleanup', async () => {
      const service = new MediaService();

      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer.mockResolvedValue({
        uri: 'file:///temp/compressed.jpg',
        name: 'compressed.jpg',
        width: 1200,
        height: 1200,
      } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      await service.capturePhoto();

      // Disk full error
      mockExists.mockResolvedValue(true);
      const diskFullError = new Error('No space left');
      (diskFullError as any).code = 'ENOSPC';
      mockUnlink.mockRejectedValue(diskFullError);

      // Should not throw
      await expect(service.cleanupTempFiles()).resolves.not.toThrow();
    });

    it('should cleanup multiple temp files', async () => {
      const service = new MediaService();

      // Mock multiple photo captures
      mockLaunchCamera.mockResolvedValue({
        assets: [
          {
            uri: 'file:///path/to/photo.jpg',
            fileName: 'photo.jpg',
            fileSize: 1024 * 1024,
          },
        ],
      } as any);

      mockImageResizer
        .mockResolvedValueOnce({
          uri: 'file:///temp/compressed1.jpg',
          name: 'compressed1.jpg',
          width: 1200,
          height: 1200,
        } as any)
        .mockResolvedValueOnce({
          uri: 'file:///temp/compressed2.jpg',
          name: 'compressed2.jpg',
          width: 1200,
          height: 1200,
        } as any)
        .mockResolvedValueOnce({
          uri: 'file:///temp/compressed3.jpg',
          name: 'compressed3.jpg',
          width: 1200,
          height: 1200,
        } as any);

      mockStat.mockResolvedValue({
        size: 500 * 1024,
        isFile: () => true,
      } as any);

      // Capture 3 photos
      await service.capturePhoto();
      await service.capturePhoto();
      await service.capturePhoto();

      mockExists.mockResolvedValue(true);
      mockUnlink.mockResolvedValue(undefined as any);

      await service.cleanupTempFiles();

      // Should have called exists and unlink for each temp file
      expect(mockExists).toHaveBeenCalledTimes(3);
      expect(mockUnlink).toHaveBeenCalledTimes(3);
    });
  });
});
