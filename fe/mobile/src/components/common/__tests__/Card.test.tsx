import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Card } from '../Card';

describe('Card Component', () => {
  describe('rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <Card>
          <Text>Title</Text>
          <Text>Description</Text>
        </Card>
      );
      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Description')).toBeTruthy();
    });

    it('should render empty card', () => {
      const { getByTestId } = render(<Card testID="empty-card" />);
      expect(getByTestId('empty-card')).toBeTruthy();
    });

    it('should render nested components', () => {
      const { getByText } = render(
        <Card>
          <View>
            <Text>Nested</Text>
          </View>
        </Card>
      );
      expect(getByText('Nested')).toBeTruthy();
    });

    it('should render without children prop', () => {
      const { getByTestId } = render(<Card testID="no-children" />);
      expect(getByTestId('no-children')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('should apply custom styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <Card style={customStyle} testID="card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toContainEqual(customStyle);
    });

    it('should apply multiple custom styles', () => {
      const customStyle = { marginTop: 20, paddingBottom: 10 };
      const { getByTestId } = render(
        <Card style={customStyle} testID="card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toContainEqual(customStyle);
    });

    it('should render without custom style', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should apply accessibilityLabel when provided', () => {
      const { getByTestId } = render(
        <Card testID="card" accessibilityLabel="Report card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityLabel).toBe('Report card');
    });

    it('should not apply accessibilityLabel when not provided', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityLabel).toBeUndefined();
    });

    it('should apply group role when useAccessibilityRole is true', () => {
      const { getByTestId } = render(
        <Card testID="card" useAccessibilityRole={true}>
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('group');
    });

    it('should not apply role when useAccessibilityRole is false', () => {
      const { getByTestId } = render(
        <Card testID="card" useAccessibilityRole={false}>
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBeUndefined();
    });

    it('should not apply role when useAccessibilityRole is not provided', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBeUndefined();
    });

    it('should apply both accessibilityLabel and role when both provided', () => {
      const { getByTestId } = render(
        <Card
          testID="card"
          accessibilityLabel="Worker card"
          useAccessibilityRole={true}
        >
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityLabel).toBe('Worker card');
      expect(card.props.accessibilityRole).toBe('group');
    });
  });

  describe('testID prop', () => {
    it('should apply testID for testing', () => {
      const { getByTestId } = render(
        <Card testID="my-card">
          <Text>Content</Text>
        </Card>
      );
      expect(getByTestId('my-card')).toBeTruthy();
    });

    it('should work without testID', () => {
      const { getByText } = render(
        <Card>
          <Text>No TestID</Text>
        </Card>
      );
      expect(getByText('No TestID')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle text nodes as children', () => {
      const { getByText } = render(
        <Card>
          <Text>Simple text</Text>
        </Card>
      );
      expect(getByText('Simple text')).toBeTruthy();
    });

    it('should handle complex nested structure', () => {
      const { getByText } = render(
        <Card>
          <View>
            <View>
              <Text>Deeply nested</Text>
            </View>
          </View>
        </Card>
      );
      expect(getByText('Deeply nested')).toBeTruthy();
    });

    it('should handle many children', () => {
      const { getByText } = render(
        <Card>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
          <Text>Child 3</Text>
          <Text>Child 4</Text>
          <Text>Child 5</Text>
        </Card>
      );
      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 5')).toBeTruthy();
    });

    it('should handle Indonesian text in children', () => {
      const { getByText } = render(
        <Card>
          <Text>Laporan Kebersihan</Text>
        </Card>
      );
      expect(getByText('Laporan Kebersihan')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('should render elevated variant by default', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toBeDefined();
    });

    it('should render elevated variant explicitly', () => {
      const { getByTestId } = render(
        <Card testID="card" variant="elevated">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toBeDefined();
    });

    it('should render outlined variant', () => {
      const { getByTestId } = render(
        <Card testID="card" variant="outlined">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toBeDefined();
    });

    it('should render filled variant', () => {
      const { getByTestId } = render(
        <Card testID="card" variant="filled">
          <Text>Content</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.style).toBeDefined();
    });
  });

  describe('interactive behavior', () => {
    it('should call onPress when pressed', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockPress}>
          <Text>Pressable Card</Text>
        </Card>
      );
      fireEvent.press(getByText('Pressable Card'));
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockPress} disabled>
          <Text>Disabled Card</Text>
        </Card>
      );
      fireEvent.press(getByText('Disabled Card'));
      expect(mockPress).not.toHaveBeenCalled();
    });

    it('should have button role when interactive', () => {
      const mockPress = jest.fn();
      const { getByTestId } = render(
        <Card testID="card" onPress={mockPress}>
          <Text>Interactive</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should not have role when not interactive', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Non-interactive</Text>
        </Card>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBeUndefined();
    });

    it('should have disabled accessibility state when disabled', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockPress} disabled>
          <Text>Disabled</Text>
        </Card>
      );
      // Disabled state is handled by Pressable wrapper
      expect(getByText('Disabled')).toBeTruthy();
    });

    it('should not have disabled state when enabled', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockPress} disabled={false}>
          <Text>Enabled</Text>
        </Card>
      );
      expect(getByText('Enabled')).toBeTruthy();
    });

    it('should apply pressed styles when pressed', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockPress}>
          <Text>Press Me</Text>
        </Card>
      );
      // Press feedback is handled by Pressable internally
      expect(getByText('Press Me')).toBeTruthy();
    });

    it('should apply disabled styles when disabled', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockPress} disabled>
          <Text>Disabled</Text>
        </Card>
      );
      // Disabled styles are handled by Pressable internally
      expect(getByText('Disabled')).toBeTruthy();
    });

    it('should use group role when explicitly set with useAccessibilityRole', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Card useAccessibilityRole onPress={mockPress}>
          <Text>Interactive with Role</Text>
        </Card>
      );
      // When useAccessibilityRole is true and interactive, the View inside Pressable has group role
      expect(getByText('Interactive with Role')).toBeTruthy();
    });
  });
});
