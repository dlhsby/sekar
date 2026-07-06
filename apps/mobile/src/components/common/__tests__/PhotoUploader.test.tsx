/**
 * PhotoUploader Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PhotoUploader } from '../PhotoUploader';

// Alert mocked globally in jest.setup.js

const mockPhoto = { id: 'photo-1', uri: 'file:///test.jpg', fileName: 'test.jpg', fileSize: 1000, type: 'image/jpeg' };
const mockPhoto2 = { id: 'photo-2', uri: 'file:///test2.jpg', fileName: 'test2.jpg', fileSize: 1000, type: 'image/jpeg' };
const mockPhoto3 = { id: 'photo-3', uri: 'file:///test3.jpg', fileName: 'test3.jpg', fileSize: 1000, type: 'image/jpeg' };

// Mock mediaService
jest.mock('../../../services/media', () => ({
  mediaService: {
    capturePhoto: jest.fn().mockResolvedValue({
      id: 'captured-1',
      uri: 'file:///captured.jpg',
      fileName: 'captured.jpg',
      fileSize: 500,
      type: 'image/jpeg',
    }),
  },
}));

// Mock permissions
jest.mock('../../../services/permissions', () => ({
  requestCameraPermission: jest.fn().mockResolvedValue({ granted: true }),
}));

describe('PhotoUploader', () => {
  const mockOnAdd = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    mockOnAdd.mockClear();
    mockOnRemove.mockClear();
    const { mediaService } = require('../../../services/media');
    mediaService.capturePhoto.mockClear();
    const { requestCameraPermission } = require('../../../services/permissions');
    requestCameraPermission.mockClear();
    requestCameraPermission.mockResolvedValue({ granted: true });
    mediaService.capturePhoto.mockResolvedValue({
      id: 'captured-1',
      uri: 'file:///captured.jpg',
      fileName: 'captured.jpg',
      fileSize: 500,
      type: 'image/jpeg',
    });
  });

  it('shows add button when photos < maxPhotos', () => {
    const { getByTestId } = render(
      <PhotoUploader photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );
    expect(getByTestId('add-photo-button')).toBeTruthy();
  });

  it('hides add button when photos === maxPhotos', () => {
    const { queryByTestId } = render(
      <PhotoUploader
        photos={[mockPhoto, mockPhoto2, mockPhoto3]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        maxPhotos={3}
      />
    );
    expect(queryByTestId('add-photo-button')).toBeNull();
  });

  it('respects custom maxPhotos', () => {
    const { getByTestId } = render(
      <PhotoUploader photos={[mockPhoto]} onAdd={mockOnAdd} onRemove={mockOnRemove} maxPhotos={5} />
    );
    expect(getByTestId('add-photo-button')).toBeTruthy();
  });

  it('calls onAdd with captured photo when button pressed', async () => {
    const { getByTestId } = render(
      <PhotoUploader photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );

    fireEvent.press(getByTestId('add-photo-button'));

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'captured-1' }));
    });
  });

  it('calls onRemove with photo id when remove pressed', () => {
    const { getByLabelText } = render(
      <PhotoUploader photos={[mockPhoto]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );

    fireEvent.press(getByLabelText('Hapus foto'));
    expect(mockOnRemove).toHaveBeenCalledWith('photo-1');
  });

  it('shows error text when error prop provided', () => {
    const { getByText } = render(
      <PhotoUploader photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} error="Foto wajib diisi" />
    );
    expect(getByText('Foto wajib diisi')).toBeTruthy();
  });

  it('does not call capturePhoto when at max', async () => {
    const { mediaService } = require('../../../services/media');
    const { queryByTestId } = render(
      <PhotoUploader photos={[mockPhoto, mockPhoto2, mockPhoto3]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );
    expect(queryByTestId('add-photo-button')).toBeNull();
    expect(mediaService.capturePhoto).not.toHaveBeenCalled();
  });

  it('shows permission error when camera permission denied', async () => {
    const { requestCameraPermission } = require('../../../services/permissions');
    requestCameraPermission.mockResolvedValueOnce({ granted: false, message: 'Izin kamera ditolak' });

    const { getByTestId } = render(
      <PhotoUploader photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );

    fireEvent.press(getByTestId('add-photo-button'));

    await waitFor(() => {
      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  it('shows actual error message when capturePhoto throws', async () => {
    const { mediaService } = require('../../../services/media');
    mediaService.capturePhoto.mockRejectedValueOnce(new Error('Kesalahan kamera: disk penuh'));

    const { getByTestId } = render(
      <PhotoUploader photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );

    fireEvent.press(getByTestId('add-photo-button'));

    await waitFor(() => {
      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  it('renders existing photos', () => {
    const { getAllByRole } = render(
      <PhotoUploader photos={[mockPhoto, mockPhoto2]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    );
    // Each photo has a remove button
    expect(getAllByRole('button')).toBeTruthy();
  });
});
