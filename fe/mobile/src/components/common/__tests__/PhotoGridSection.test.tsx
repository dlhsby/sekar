/**
 * PhotoGridSection.test.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PhotoGridSection } from '../PhotoGridSection';

describe('PhotoGridSection', () => {
  const mockPhotoUrls = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];
  const mockOnPhotoPress = jest.fn();

  beforeEach(() => {
    mockOnPhotoPress.mockClear();
  });

  describe('emoji header variant', () => {
    it('should render with emoji header', () => {
      const { getByText } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="FOTO LOKASI"
          count={2}
        />
      );

      expect(getByText(/📸 FOTO LOKASI \(2\)/)).toBeTruthy();
    });

    it('should render photos in horizontal scroll', () => {
      const { getAllByRole } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="FOTO LOKASI"
        />
      );

      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(2);
    });

    it('should call onPhotoPress when photo is tapped', () => {
      const { getAllByRole } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="FOTO LOKASI"
        />
      );

      const buttons = getAllByRole('button');
      fireEvent.press(buttons[0]);

      expect(mockOnPhotoPress).toHaveBeenCalledWith(mockPhotoUrls[0]);
    });

    it('should auto-compute count if not provided', () => {
      const { getByText } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="FOTO LOKASI"
        />
      );

      expect(getByText(/📸 FOTO LOKASI \(2\)/)).toBeTruthy();
    });

    it('should return null if no photos', () => {
      const { queryByText } = render(
        <PhotoGridSection
          photos={[]}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="FOTO LOKASI"
        />
      );

      expect(queryByText(/FOTO LOKASI/)).toBeNull();
    });
  });

  describe('icon header variant', () => {
    it('should render with icon header and subtitle', () => {
      const { getByText } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="icon"
          iconName="image-multiple-outline"
          title="FOTO BUKTI"
          subtitle="2 foto dilampirkan"
        />
      );

      expect(getByText('FOTO BUKTI')).toBeTruthy();
      expect(getByText('2 foto dilampirkan')).toBeTruthy();
    });

    it('should render icon in header', () => {
      const { getByTestId } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="icon"
          iconName="image-multiple-outline"
          title="FOTO BUKTI"
          testID="photo-grid-test"
        />
      );

      expect(getByTestId('photo-grid-test')).toBeTruthy();
    });
  });

  describe('per-photo labels', () => {
    it('should render per-photo labels when provided', () => {
      const photosWithLabels = [
        { url: 'https://example.com/photo1.jpg', label: 'Mulai Lembur' },
        { url: 'https://example.com/photo2.jpg', label: 'Selesai Lembur' },
      ];

      const { getByText } = render(
        <PhotoGridSection
          photos={photosWithLabels}
          onPhotoPress={mockOnPhotoPress}
          headerType="icon"
          iconName="account-circle-outline"
          title="SELFIE VERIFIKASI"
        />
      );

      expect(getByText('Mulai Lembur')).toBeTruthy();
      expect(getByText('Selesai Lembur')).toBeTruthy();
    });

    it('should call onPhotoPress with correct URL for labeled photos', () => {
      const photosWithLabels = [
        { url: 'https://example.com/selfie1.jpg', label: 'Mulai Lembur' },
      ];

      const { getAllByRole } = render(
        <PhotoGridSection
          photos={photosWithLabels}
          onPhotoPress={mockOnPhotoPress}
          headerType="icon"
          iconName="account-circle-outline"
          title="SELFIE VERIFIKASI"
        />
      );

      const buttons = getAllByRole('button');
      fireEvent.press(buttons[0]);

      expect(mockOnPhotoPress).toHaveBeenCalledWith('https://example.com/selfie1.jpg');
    });

    it('should mix labeled and unlabeled photos', () => {
      const mixedPhotos = [
        { url: 'https://example.com/photo1.jpg' },
        { url: 'https://example.com/photo2.jpg', label: 'Photo with label' },
      ];

      const { getByText, queryByText } = render(
        <PhotoGridSection
          photos={mixedPhotos}
          onPhotoPress={mockOnPhotoPress}
          headerType="icon"
          iconName="image-multiple-outline"
          title="MIXED PHOTOS"
        />
      );

      expect(getByText('Photo with label')).toBeTruthy();
      expect(queryByText('undefined')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels for emoji variant', () => {
      const { getAllByLabelText } = render(
        <PhotoGridSection
          photos={mockPhotoUrls}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="FOTO LOKASI"
        />
      );

      const accessibilityLabels = getAllByLabelText(/Foto \d+/);
      expect(accessibilityLabels.length).toBeGreaterThan(0);
    });

    it('should have proper accessibility labels for labeled photos', () => {
      const photosWithLabels = [
        { url: 'https://example.com/photo1.jpg', label: 'Mulai Lembur' },
      ];

      const { getByLabelText } = render(
        <PhotoGridSection
          photos={photosWithLabels}
          onPhotoPress={mockOnPhotoPress}
          headerType="icon"
          iconName="account-circle-outline"
          title="SELFIE"
        />
      );

      expect(getByLabelText(/Mulai Lembur/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle single photo', () => {
      const { getAllByRole } = render(
        <PhotoGridSection
          photos={['https://example.com/single.jpg']}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="SINGLE"
        />
      );

      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(1);
    });

    it('should handle many photos', () => {
      const manyPhotos = Array.from({ length: 10 }, (_, i) => `https://example.com/photo${i}.jpg`);

      const { getAllByRole } = render(
        <PhotoGridSection
          photos={manyPhotos}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="MANY"
        />
      );

      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(10);
    });

    it('should normalize string array to internal format', () => {
      const { getAllByRole } = render(
        <PhotoGridSection
          photos={['https://example.com/photo1.jpg']}
          onPhotoPress={mockOnPhotoPress}
          headerType="emoji"
          title="NORMALIZED"
        />
      );

      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(1);

      fireEvent.press(buttons[0]);
      expect(mockOnPhotoPress).toHaveBeenCalledWith('https://example.com/photo1.jpg');
    });
  });
});
