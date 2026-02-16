/**
 * usePhotoCapture Hook Tests
 * Phase 2C: camera capture for 1-3 photos
 */

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { usePhotoCapture } from '../usePhotoCapture';
import { launchCamera } from 'react-native-image-picker';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockLaunchCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;

describe('usePhotoCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty photos', () => {
    const { result } = renderHook(() => usePhotoCapture());

    expect(result.current.photos).toEqual([]);
    expect(result.current.photoCount).toBe(0);
    expect(result.current.canAddMore).toBe(true);
    expect(result.current.isCapturing).toBe(false);
  });

  it('should capture a photo', async () => {
    mockLaunchCamera.mockResolvedValue({
      assets: [{ base64: 'abc123', uri: 'file://photo.jpg' }],
    });

    const { result } = renderHook(() => usePhotoCapture());

    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0]).toBe('data:image/jpeg;base64,abc123');
    expect(result.current.photoCount).toBe(1);
    expect(result.current.canAddMore).toBe(true);
  });

  it('should handle camera cancel', async () => {
    mockLaunchCamera.mockResolvedValue({ didCancel: true });

    const { result } = renderHook(() => usePhotoCapture());

    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toEqual([]);
  });

  it('should handle missing base64', async () => {
    mockLaunchCamera.mockResolvedValue({
      assets: [{ uri: 'file://photo.jpg' }],
    });

    const { result } = renderHook(() => usePhotoCapture());

    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toEqual([]);
  });

  it('should enforce max photos limit', async () => {
    mockLaunchCamera.mockResolvedValue({
      assets: [{ base64: 'photo', uri: 'file://photo.jpg' }],
    });

    const { result } = renderHook(() => usePhotoCapture(2));

    // Add 2 photos
    await act(async () => {
      await result.current.capturePhoto();
    });
    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toHaveLength(2);
    expect(result.current.canAddMore).toBe(false);

    // Try adding a 3rd
    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toHaveLength(2);
    expect(Alert.alert).toHaveBeenCalledWith('Batas Foto', 'Maksimal 2 foto');
  });

  it('should remove photo by index', async () => {
    mockLaunchCamera.mockResolvedValue({
      assets: [{ base64: 'photo', uri: 'file://photo.jpg' }],
    });

    const { result } = renderHook(() => usePhotoCapture());

    await act(async () => {
      await result.current.capturePhoto();
    });
    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toHaveLength(2);

    act(() => {
      result.current.removePhoto(0);
    });

    expect(result.current.photos).toHaveLength(1);
  });

  it('should clear all photos', async () => {
    mockLaunchCamera.mockResolvedValue({
      assets: [{ base64: 'photo', uri: 'file://photo.jpg' }],
    });

    const { result } = renderHook(() => usePhotoCapture());

    await act(async () => {
      await result.current.capturePhoto();
    });

    act(() => {
      result.current.clearPhotos();
    });

    expect(result.current.photos).toEqual([]);
    expect(result.current.photoCount).toBe(0);
    expect(result.current.canAddMore).toBe(true);
  });

  it('should handle camera error', async () => {
    mockLaunchCamera.mockRejectedValue(new Error('Camera unavailable'));

    const { result } = renderHook(() => usePhotoCapture());

    await act(async () => {
      await result.current.capturePhoto();
    });

    expect(result.current.photos).toEqual([]);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Gagal mengambil foto');
  });

  it('should use default max of 3 photos', () => {
    const { result } = renderHook(() => usePhotoCapture());
    expect(result.current.canAddMore).toBe(true);
  });
});
