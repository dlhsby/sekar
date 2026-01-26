/**
 * NBBadge Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { NBBadge } from '../NBBadge';

describe('NBBadge', () => {
  describe('rendering', () => {
    it('renders text in uppercase', () => {
      const { getByText } = render(<NBBadge text="pending" />);
      expect(getByText('PENDING')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBBadge text="active" testID="status-badge" />,
      );
      expect(getByTestId('status-badge')).toBeTruthy();
    });

    it('renders already uppercase text correctly', () => {
      const { getByText } = render(<NBBadge text="URGENT" />);
      expect(getByText('URGENT')).toBeTruthy();
    });
  });

  describe('colors', () => {
    it('renders primary color by default', () => {
      const { getByTestId } = render(
        <NBBadge text="default" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders primary color', () => {
      const { getByTestId } = render(
        <NBBadge text="primary" color="primary" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders success color', () => {
      const { getByTestId } = render(
        <NBBadge text="completed" color="success" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders warning color', () => {
      const { getByTestId } = render(
        <NBBadge text="pending" color="warning" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders danger color', () => {
      const { getByTestId } = render(
        <NBBadge text="urgent" color="danger" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders gray color', () => {
      const { getByTestId } = render(
        <NBBadge text="inactive" color="gray" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders navy color', () => {
      const { getByTestId } = render(
        <NBBadge text="official" color="navy" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders md size by default', () => {
      const { getByTestId } = render(
        <NBBadge text="medium" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders sm size', () => {
      const { getByTestId } = render(
        <NBBadge text="small" size="sm" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('renders lg size', () => {
      const { getByTestId } = render(
        <NBBadge text="large" size="lg" testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies custom style', () => {
      const customStyle = { marginLeft: 10 };
      const { getByTestId } = render(
        <NBBadge text="styled" style={customStyle} testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('applies custom text style', () => {
      const customTextStyle = { letterSpacing: 1 };
      const { getByTestId } = render(
        <NBBadge text="custom" textStyle={customTextStyle} testID="badge" />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });

    it('applies both custom container and text style', () => {
      const customStyle = { marginRight: 8 };
      const customTextStyle = { fontSize: 14 };
      const { getByTestId } = render(
        <NBBadge
          text="both"
          style={customStyle}
          textStyle={customTextStyle}
          testID="badge"
        />,
      );
      expect(getByTestId('badge')).toBeTruthy();
    });
  });

  describe('use cases', () => {
    it('renders status badge', () => {
      const { getByText } = render(
        <NBBadge text="active" color="success" size="sm" />,
      );
      expect(getByText('ACTIVE')).toBeTruthy();
    });

    it('renders priority badge', () => {
      const { getByText } = render(
        <NBBadge text="high" color="danger" size="md" />,
      );
      expect(getByText('HIGH')).toBeTruthy();
    });

    it('renders category badge', () => {
      const { getByText } = render(
        <NBBadge text="taman" color="primary" size="lg" />,
      );
      expect(getByText('TAMAN')).toBeTruthy();
    });

    it('renders role badge', () => {
      const { getByText } = render(
        <NBBadge text="linmas" color="navy" />,
      );
      expect(getByText('LINMAS')).toBeTruthy();
    });
  });
});
