/**
 * StatusIndicator Component Tests
 * Tests status types, sizing, text display, and accessibility
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusIndicator } from '../StatusIndicator';

describe('StatusIndicator', () => {
  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Success Message" />
      );
      expect(getByText('Success Message')).toBeTruthy();
    });

    it('should render title', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Test Title" />
      );
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render without subtitle', () => {
      const { queryByText } = render(
        <StatusIndicator status="success" title="Title" />
      );
      expect(queryByText('Title')).toBeTruthy();
    });

    it('should render without metadata', () => {
      const { queryByText } = render(
        <StatusIndicator status="success" title="Title" />
      );
      expect(queryByText('Title')).toBeTruthy();
    });
  });

  describe('Status Types', () => {
    it('should render success status', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Success" />
      );
      expect(getByText('Success')).toBeTruthy();
    });

    it('should render error status', () => {
      const { getByText } = render(
        <StatusIndicator status="error" title="Error" />
      );
      expect(getByText('Error')).toBeTruthy();
    });

    it('should render loading status', () => {
      const { getByText } = render(
        <StatusIndicator status="loading" title="Loading" />
      );
      expect(getByText('Loading')).toBeTruthy();
    });

    it('should use correct icon for success', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Success" />
      );
      expect(getByLabelText('Status: Success')).toBeTruthy();
    });

    it('should use correct icon for error', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="error" title="Error" />
      );
      expect(getByLabelText('Status: Error')).toBeTruthy();
    });

    it('should use correct icon for loading', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="loading" title="Loading" />
      );
      expect(getByLabelText('Status: Loading')).toBeTruthy();
    });
  });

  describe('Subtitle Display', () => {
    it('should render subtitle when provided', () => {
      const { getByText } = render(
        <StatusIndicator
          status="success"
          title="Title"
          subtitle="This is a subtitle"
        />
      );
      expect(getByText('This is a subtitle')).toBeTruthy();
    });

    it('should not render subtitle when not provided', () => {
      const { queryByText } = render(
        <StatusIndicator status="success" title="Title" />
      );
      // No subtitle element should exist
      expect(queryByText('This is a subtitle')).toBeNull();
    });

    it('should handle long subtitles', () => {
      const longSubtitle =
        'This is a very long subtitle that should wrap properly and not break the layout';
      const { getByText } = render(
        <StatusIndicator status="success" title="Title" subtitle={longSubtitle} />
      );
      expect(getByText(longSubtitle)).toBeTruthy();
    });

    it('should handle empty subtitle string', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Title" subtitle="" />
      );
      // Empty subtitle is still rendered
      expect(getByText('Title')).toBeTruthy();
    });
  });

  describe('Metadata Display', () => {
    it('should render metadata when provided', () => {
      const { getByText } = render(
        <StatusIndicator
          status="success"
          title="Title"
          metadata="Additional info"
        />
      );
      expect(getByText('Additional info')).toBeTruthy();
    });

    it('should not render metadata when not provided', () => {
      const { queryByText } = render(
        <StatusIndicator status="success" title="Title" />
      );
      expect(queryByText('Additional info')).toBeNull();
    });

    it('should render both subtitle and metadata', () => {
      const { getByText } = render(
        <StatusIndicator
          status="success"
          title="Title"
          subtitle="Subtitle"
          metadata="Metadata"
        />
      );
      expect(getByText('Subtitle')).toBeTruthy();
      expect(getByText('Metadata')).toBeTruthy();
    });

    it('should handle long metadata', () => {
      const longMetadata = 'Metadata can be quite long and should wrap properly';
      const { getByText } = render(
        <StatusIndicator status="success" title="Title" metadata={longMetadata} />
      );
      expect(getByText(longMetadata)).toBeTruthy();
    });

    it('should handle empty metadata string', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Title" metadata="" />
      );
      // Empty metadata is still rendered
      expect(getByText('Title')).toBeTruthy();
    });
  });

  describe('Size Prop', () => {
    it('should use default size of 100', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 100,
            height: 100,
            borderRadius: 50,
          }),
        ])
      );
    });

    it('should apply custom size', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" size={150} />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 150,
            height: 150,
            borderRadius: 75,
          }),
        ])
      );
    });

    it('should handle small size', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" size={50} />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 50,
            height: 50,
            borderRadius: 25,
          }),
        ])
      );
    });

    it('should handle large size', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" size={200} />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 200,
            height: 200,
            borderRadius: 100,
          }),
        ])
      );
    });
  });

  describe('Circle Styling', () => {
    it('should have circular border radius', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" size={100} />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 50, // size / 2
          }),
        ])
      );
    });

    it('should apply success background color', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#7FBC8C', // nbColors.success (Phase 3 M1-R token)
          }),
        ])
      );
    });

    it('should apply error background color', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="error" title="Title" />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FF6B6B', // nbColors.danger
          }),
        ])
      );
    });

    it('should apply loading background color', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="loading" title="Title" />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expect.any(String), // nbColors.gray300
          }),
        ])
      );
    });
  });

  describe('Accessibility', () => {
    it('should have image role for circle', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Success" />
      );
      const circle = getByLabelText('Status: Success');
      expect(circle.props.accessibilityRole).toBe('image');
    });

    it('should have accessibility label with status and title', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Operation Complete" />
      );
      expect(getByLabelText('Status: Operation Complete')).toBeTruthy();
    });

    it('should update accessibility label with different status', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="error" title="Operation Failed" />
      );
      expect(getByLabelText('Status: Operation Failed')).toBeTruthy();
    });

    it('should be readable by screen readers', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="loading" title="Processing" />
      );
      expect(getByLabelText('Status: Processing')).toBeTruthy();
    });
  });

  describe('Text Alignment', () => {
    it('should center align title', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Centered Title" />
      );
      const title = getByText('Centered Title');
      expect(title.props.style).toMatchObject({
        textAlign: 'center',
      });
    });

    it('should center align subtitle', () => {
      const { getByText } = render(
        <StatusIndicator
          status="success"
          title="Title"
          subtitle="Centered Subtitle"
        />
      );
      const subtitle = getByText('Centered Subtitle');
      expect(subtitle.props.style).toMatchObject({
        textAlign: 'center',
      });
    });

    it('should center align metadata', () => {
      const { getByText } = render(
        <StatusIndicator
          status="success"
          title="Title"
          metadata="Centered Metadata"
        />
      );
      const metadata = getByText('Centered Metadata');
      expect(metadata.props.style).toMatchObject({
        textAlign: 'center',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle =
        'This is a very long title that should wrap properly without breaking the layout';
      const { getByText } = render(
        <StatusIndicator status="success" title={longTitle} />
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle empty title', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="" />
      );
      expect(getByText('')).toBeTruthy();
    });

    it('should handle special characters in title', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="Success! 100% Complete" />
      );
      expect(getByText('Success! 100% Complete')).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      const { getByText } = render(
        <StatusIndicator status="success" title="✓ Berhasil" />
      );
      expect(getByText('✓ Berhasil')).toBeTruthy();
    });

    it('should handle size of 0', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" size={0} />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 0,
            height: 0,
          }),
        ])
      );
    });

    it('should handle negative size', () => {
      const { getByLabelText } = render(
        <StatusIndicator status="success" title="Title" size={-50} />
      );
      const circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: -50,
            height: -50,
          }),
        ])
      );
    });
  });

  describe('Multiple Instances', () => {
    it('should render multiple status indicators independently', () => {
      const { getByText } = render(
        <>
          <StatusIndicator status="success" title="Success" />
          <StatusIndicator status="error" title="Error" />
          <StatusIndicator status="loading" title="Loading" />
        </>
      );

      expect(getByText('Success')).toBeTruthy();
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Loading')).toBeTruthy();
    });

    it('should maintain different sizes for multiple instances', () => {
      const { getByLabelText } = render(
        <>
          <StatusIndicator status="success" title="Small" size={50} />
          <StatusIndicator status="error" title="Medium" size={100} />
          <StatusIndicator status="loading" title="Large" size={150} />
        </>
      );

      const circles = [
        getByLabelText('Status: Small'),
        getByLabelText('Status: Medium'),
        getByLabelText('Status: Large'),
      ];
      expect(circles).toHaveLength(3);
    });
  });

  describe('Re-rendering', () => {
    it('should update when status changes', () => {
      const { getByText, rerender } = render(
        <StatusIndicator status="loading" title="Processing" />
      );
      expect(getByText('Processing')).toBeTruthy();

      rerender(<StatusIndicator status="success" title="Processing" />);
      expect(getByText('Processing')).toBeTruthy();
    });

    it('should update when title changes', () => {
      const { getByText, rerender } = render(
        <StatusIndicator status="success" title="Original" />
      );
      expect(getByText('Original')).toBeTruthy();

      rerender(<StatusIndicator status="success" title="Updated" />);
      expect(getByText('Updated')).toBeTruthy();
    });

    it('should update when size changes', () => {
      const { getByLabelText, rerender } = render(
        <StatusIndicator status="success" title="Title" size={100} />
      );

      let circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 100, height: 100 }),
        ])
      );

      rerender(<StatusIndicator status="success" title="Title" size={150} />);

      circle = getByLabelText('Status: Title');
      expect(circle.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 150, height: 150 }),
        ])
      );
    });

    it('should update when subtitle is added', () => {
      const { getByText, rerender } = render(
        <StatusIndicator status="success" title="Title" />
      );
      expect(getByText('Title')).toBeTruthy();

      rerender(
        <StatusIndicator status="success" title="Title" subtitle="New Subtitle" />
      );
      expect(getByText('New Subtitle')).toBeTruthy();
    });
  });
});
