/**
 * NBCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBCardFooter } from '../NBCard';

// Haptic feedback mocked in jest.setup.js

describe('NBCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('static card', () => {
    it('renders children', () => {
      const { getByText } = render(
        <NBCard>
          <Text>Card content</Text>
        </NBCard>,
      );
      expect(getByText('Card content')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBCard testID="test-card">
          <Text>Content</Text>
        </NBCard>,
      );
      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <NBCard testID="test-card" style={customStyle}>
          <Text>Content</Text>
        </NBCard>,
      );
      expect(getByTestId('test-card')).toBeTruthy();
    });
  });

  describe('interactive card', () => {
    it('renders as touchable when interactive with onPress', () => {
      const { getByTestId } = render(
        <NBCard interactive onPress={mockOnPress} testID="test-card">
          <Text>Content</Text>
        </NBCard>,
      );
      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
      const { getByTestId } = render(
        <NBCard interactive onPress={mockOnPress} testID="test-card">
          <Text>Content</Text>
        </NBCard>,
      );
      fireEvent.press(getByTestId('test-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('renders as static View when not interactive (even if onPress provided)', () => {
      const { getByTestId } = render(
        <NBCard onPress={mockOnPress} testID="test-card">
          <Text>Content</Text>
        </NBCard>,
      );
      // Static card should not have button role
      const card = getByTestId('test-card');
      expect(card.props.accessibilityRole).not.toBe('button');
    });

    it('has button accessibility role when interactive', () => {
      const { getByTestId } = render(
        <NBCard interactive onPress={mockOnPress} testID="test-card">
          <Text>Content</Text>
        </NBCard>,
      );
      const card = getByTestId('test-card');
      expect(card.props.accessibilityRole).toBe('button');
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { getByTestId } = render(
        <NBCard testID="default-card">
          <Text>Default card</Text>
        </NBCard>,
      );
      expect(getByTestId('default-card')).toBeTruthy();
    });

    it('renders elevated variant', () => {
      const { getByTestId } = render(
        <NBCard variant="elevated" testID="elevated-card">
          <Text>Elevated card</Text>
        </NBCard>,
      );
      expect(getByTestId('elevated-card')).toBeTruthy();
    });

    it('renders interactive elevated card', () => {
      const { getByTestId } = render(
        <NBCard
          variant="elevated"
          interactive
          onPress={mockOnPress}
          testID="elevated-interactive-card"
        >
          <Text>Elevated interactive</Text>
        </NBCard>,
      );
      fireEvent.press(getByTestId('elevated-interactive-card'));
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('is accessible', () => {
      const { getByTestId } = render(
        <NBCard testID="test-card" accessibilityLabel="Information card">
          <Text>Content</Text>
        </NBCard>,
      );
      const card = getByTestId('test-card');
      expect(card.props.accessible).toBe(true);
    });

    it('accepts custom accessibility props', () => {
      const { getByTestId } = render(
        <NBCard
          testID="test-card"
          accessibilityLabel="Important card"
          accessibilityHint="Contains important information"
        >
          <Text>Content</Text>
        </NBCard>,
      );
      const card = getByTestId('test-card');
      expect(card.props.accessibilityLabel).toBe('Important card');
    });
  });
});

describe('NBCardHeader', () => {
  it('renders children', () => {
    const { getByText } = render(
      <NBCardHeader>
        <Text>Header content</Text>
      </NBCardHeader>,
    );
    expect(getByText('Header content')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <NBCardHeader style={customStyle}>
        <Text>Header</Text>
      </NBCardHeader>,
    );
    expect(getByText('Header')).toBeTruthy();
  });
});

describe('NBCardContent', () => {
  it('renders children', () => {
    const { getByText } = render(
      <NBCardContent>
        <Text>Main content</Text>
      </NBCardContent>,
    );
    expect(getByText('Main content')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { padding: 32 };
    const { getByText } = render(
      <NBCardContent style={customStyle}>
        <Text>Content</Text>
      </NBCardContent>,
    );
    expect(getByText('Content')).toBeTruthy();
  });
});

describe('NBCardFooter', () => {
  it('renders children', () => {
    const { getByText } = render(
      <NBCardFooter>
        <Text>Footer content</Text>
      </NBCardFooter>,
    );
    expect(getByText('Footer content')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { justifyContent: 'flex-end' as const };
    const { getByText } = render(
      <NBCardFooter style={customStyle}>
        <Text>Footer</Text>
      </NBCardFooter>,
    );
    expect(getByText('Footer')).toBeTruthy();
  });
});

describe('NBCard composition', () => {
  it('renders full card structure', () => {
    const { getByText } = render(
      <NBCard testID="full-card">
        <NBCardHeader>
          <Text>Title</Text>
        </NBCardHeader>
        <NBCardContent>
          <Text>Body content</Text>
        </NBCardContent>
        <NBCardFooter>
          <Text>Action buttons</Text>
        </NBCardFooter>
      </NBCard>,
    );
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Body content')).toBeTruthy();
    expect(getByText('Action buttons')).toBeTruthy();
  });

  it('renders interactive card with sections', () => {
    const handlePress = jest.fn();
    const { getByText, getByTestId } = render(
      <NBCard interactive onPress={handlePress} testID="interactive-card">
        <NBCardHeader>
          <Text>Task Title</Text>
        </NBCardHeader>
        <NBCardContent>
          <Text>Task description goes here</Text>
        </NBCardContent>
      </NBCard>,
    );
    expect(getByText('Task Title')).toBeTruthy();
    expect(getByText('Task description goes here')).toBeTruthy();
    fireEvent.press(getByTestId('interactive-card'));
    expect(handlePress).toHaveBeenCalled();
  });
});
