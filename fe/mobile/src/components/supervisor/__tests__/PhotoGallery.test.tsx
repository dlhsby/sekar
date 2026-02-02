/**
 * PhotoGallery Component Tests
 * Unit tests for horizontal photo gallery with fullscreen modal
 */

// Alert is mocked globally in jest.setup.js - no need to mock here

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PhotoGallery } from '../PhotoGallery';

describe('PhotoGallery', () => {
  const mockPhotos = [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
    'https://example.com/photo3.jpg',
  ];

  const testID = 'photo-gallery';

  describe('empty state', () => {
    it('should render empty message when photos array is empty', () => {
      render(<PhotoGallery photos={[]} testID={testID} />);

      expect(screen.getByText('Tidak ada foto')).toBeTruthy();
    });

    it('should render empty message when photos is undefined', () => {
      render(<PhotoGallery photos={undefined as any} testID={testID} />);

      expect(screen.getByText('Tidak ada foto')).toBeTruthy();
    });

    it('should have empty testID', () => {
      render(<PhotoGallery photos={[]} testID={testID} />);

      expect(screen.getByTestId(`${testID}-empty`)).toBeTruthy();
    });
  });

  describe('thumbnail rendering', () => {
    it('should render thumbnails for all photos', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      expect(screen.getByTestId(`${testID}-thumbnail-0`)).toBeTruthy();
      expect(screen.getByTestId(`${testID}-thumbnail-1`)).toBeTruthy();
      expect(screen.getByTestId(`${testID}-thumbnail-2`)).toBeTruthy();
    });

    it('should render single photo', () => {
      render(<PhotoGallery photos={['https://example.com/single.jpg']} testID={testID} />);

      expect(screen.getByTestId(`${testID}-thumbnail-0`)).toBeTruthy();
    });

    it('should handle many photos', () => {
      const manyPhotos = Array.from({ length: 10 }, (_, i) => `https://example.com/photo${i}.jpg`);
      render(<PhotoGallery photos={manyPhotos} testID={testID} />);

      for (let i = 0; i < 10; i++) {
        expect(screen.getByTestId(`${testID}-thumbnail-${i}`)).toBeTruthy();
      }
    });
  });

  describe('modal interactions', () => {
    it('should open modal when thumbnail is pressed', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      const thumbnail = screen.getByTestId(`${testID}-thumbnail-0`);
      fireEvent.press(thumbnail);

      expect(screen.getByTestId(`${testID}-modal`)).toBeTruthy();
    });

    it('should display selected photo in modal', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      const thumbnail = screen.getByTestId(`${testID}-thumbnail-1`);
      fireEvent.press(thumbnail);

      // Modal should be visible
      expect(screen.getByTestId(`${testID}-modal`)).toBeTruthy();
    });

    it('should close modal when close button is pressed', async () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      // Open modal
      const thumbnail = screen.getByTestId(`${testID}-thumbnail-0`);
      fireEvent.press(thumbnail);

      // Verify modal is open
      expect(screen.getByTestId(`${testID}-modal`)).toBeTruthy();
      expect(screen.getByTestId(`${testID}-close-button`)).toBeTruthy();

      // Close modal
      const closeButton = screen.getByTestId(`${testID}-close-button`);
      fireEvent.press(closeButton);

      // Modal content should be removed (close button no longer accessible)
      await waitFor(() => {
        expect(screen.queryByTestId(`${testID}-close-button`)).toBeNull();
      });
    });

    it('should close modal when background is pressed', async () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      // Open modal
      const thumbnail = screen.getByTestId(`${testID}-thumbnail-0`);
      fireEvent.press(thumbnail);

      // Verify modal is open
      expect(screen.getByTestId(`${testID}-modal-background`)).toBeTruthy();

      // Press background
      const modalBackground = screen.getByTestId(`${testID}-modal-background`);
      fireEvent.press(modalBackground);

      // Modal content should be removed
      await waitFor(() => {
        expect(screen.queryByTestId(`${testID}-modal-background`)).toBeNull();
      });
    });

    it('should show close button with X symbol', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      const thumbnail = screen.getByTestId(`${testID}-thumbnail-0`);
      fireEvent.press(thumbnail);

      expect(screen.getByText('✕')).toBeTruthy();
    });
  });

  describe('navigation between photos', () => {
    it('should open modal for different photos', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      // Open first photo
      fireEvent.press(screen.getByTestId(`${testID}-thumbnail-0`));
      expect(screen.getByTestId(`${testID}-modal`).props.visible).toBe(true);

      // Close modal
      fireEvent.press(screen.getByTestId(`${testID}-close-button`));

      // Open second photo
      fireEvent.press(screen.getByTestId(`${testID}-thumbnail-1`));
      expect(screen.getByTestId(`${testID}-modal`).props.visible).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have testID on main container', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      expect(screen.getByTestId(testID)).toBeTruthy();
    });

    it('should have testID on modal', () => {
      render(<PhotoGallery photos={mockPhotos} testID={testID} />);

      const thumbnail = screen.getByTestId(`${testID}-thumbnail-0`);
      fireEvent.press(thumbnail);

      expect(screen.getByTestId(`${testID}-modal`)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle duplicate photo URLs', () => {
      const duplicatePhotos = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo1.jpg',
        'https://example.com/photo1.jpg',
      ];
      render(<PhotoGallery photos={duplicatePhotos} testID={testID} />);

      expect(screen.getByTestId(`${testID}-thumbnail-0`)).toBeTruthy();
      expect(screen.getByTestId(`${testID}-thumbnail-1`)).toBeTruthy();
      expect(screen.getByTestId(`${testID}-thumbnail-2`)).toBeTruthy();
    });

    it('should handle long URLs', () => {
      const longUrls = ['https://example.com/very/long/path/to/photo/with/many/segments/image.jpg'];
      render(<PhotoGallery photos={longUrls} testID={testID} />);

      expect(screen.getByTestId(`${testID}-thumbnail-0`)).toBeTruthy();
    });
  });
});
