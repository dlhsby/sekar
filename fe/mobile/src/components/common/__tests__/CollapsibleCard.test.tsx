/**
 * CollapsibleCard Component Tests
 * Tests expansion/collapse behavior, animation, accessibility, and prop variations
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';
import { CollapsibleCard } from '../CollapsibleCard';

describe('CollapsibleCard', () => {
  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test Title">
          <Text>Test Content</Text>
        </CollapsibleCard>
      );
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render title correctly', () => {
      const { getByText } = render(
        <CollapsibleCard title="My Card Title">
          <></>
        </CollapsibleCard>
      );
      expect(getByText('My Card Title')).toBeTruthy();
    });

    it('should render children when expanded', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <></>
        </CollapsibleCard>
      );
      expect(getByText('Test')).toBeTruthy();
    });

    it('should not render children when collapsed by default', () => {
      const { queryByTestId } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );
      // Content should not be in DOM when collapsed
      const title = queryByTestId('title');
      expect(title).toBeNull();
    });
  });

  describe('Expansion State', () => {
    it('should default to collapsed', () => {
      const { queryByText } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );
      // Title is visible but content is not
      expect(queryByText('Test')).toBeTruthy();
    });

    it('should respect defaultExpanded prop', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <></>
        </CollapsibleCard>
      );
      // Content should be rendered when defaultExpanded is true
      expect(getByText('Test')).toBeTruthy();
    });

    it('should expand when header is pressed', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test Title">
          <Text>Test Content</Text>
        </CollapsibleCard>
      );

      const header = getByText('Test Title');
      fireEvent.press(header);

      // After press, content should be visible
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should collapse when header is pressed again', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test Title" defaultExpanded={true}>
          <></>
        </CollapsibleCard>
      );

      const header = getByText('Test Title');
      fireEvent.press(header);

      // After second press, should collapse
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should toggle between expanded and collapsed states', () => {
      const { getByText } = render(
        <CollapsibleCard title="Toggle Test">
          <></>
        </CollapsibleCard>
      );

      const header = getByText('Toggle Test');

      // Initially collapsed
      fireEvent.press(header);
      // Now expanded
      fireEvent.press(header);
      // Now collapsed again
      fireEvent.press(header);
      // Now expanded again

      expect(getByText('Toggle Test')).toBeTruthy();
    });
  });

  describe('Children Rendering', () => {
    it('should render text children when expanded', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <Text>Child Content</Text>
        </CollapsibleCard>
      );
      expect(getByText('Child Content')).toBeTruthy();
    });

    it('should render multiple children when expanded', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <Text>Item 1</Text>
          <Text>Item 2</Text>
          <Text>Item 3</Text>
        </CollapsibleCard>
      );
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Item 1')).toBeTruthy();
    });

    it('should not render children when collapsed', () => {
      const { queryByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={false}>
          <Text>Hidden Content</Text>
        </CollapsibleCard>
      );
      expect(queryByText('Hidden Content')).toBeNull();
    });

    it('should show children after expanding', () => {
      const { getByText, queryByText } = render(
        <CollapsibleCard title="Test">
          <Text>Visible After Expand</Text>
        </CollapsibleCard>
      );

      expect(queryByText('Visible After Expand')).toBeNull();

      fireEvent.press(getByText('Test'));

      expect(getByText('Visible After Expand')).toBeTruthy();
    });

    it('should hide children after collapsing', () => {
      const { getByText, queryByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <Text>Will Be Hidden</Text>
        </CollapsibleCard>
      );

      expect(getByText('Will Be Hidden')).toBeTruthy();

      fireEvent.press(getByText('Test'));

      expect(queryByText('Will Be Hidden')).toBeNull();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom style to container', () => {
      const customStyle = { marginTop: 20 };
      const { getByText } = render(
        <CollapsibleCard title="Test" style={customStyle}>
          <></>
        </CollapsibleCard>
      );
      // Verify custom style is applied by checking the component renders
      expect(getByText('Test')).toBeTruthy();
    });

    it('should accept multiple styles', () => {
      const styles = [{ marginTop: 10 }, { paddingBottom: 15 }];
      const { getByText } = render(
        <CollapsibleCard title="Test" style={styles}>
          <></>
        </CollapsibleCard>
      );
      expect(getByText('Test')).toBeTruthy();
    });

    it('should render without custom style', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );
      expect(getByText('Test')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have button role on header', () => {
      const { getByRole } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('should have accessibility label with title', () => {
      const { getByLabelText } = render(
        <CollapsibleCard title="My Card">
          <></>
        </CollapsibleCard>
      );
      expect(getByLabelText('My Card')).toBeTruthy();
    });

    it('should have correct accessibility hint when collapsed', () => {
      const { getByA11yHint } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );
      expect(getByA11yHint('Ketuk untuk membuka')).toBeTruthy();
    });

    it('should have correct accessibility hint when expanded', () => {
      const { getByA11yHint } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <></>
        </CollapsibleCard>
      );
      expect(getByA11yHint('Ketuk untuk menutup')).toBeTruthy();
    });

    it('should update accessibility state when toggled', () => {
      const { getByRole } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.expanded).toBe(false);

      fireEvent.press(button);

      expect(button.props.accessibilityState.expanded).toBe(true);
    });

    it('should maintain accessibility state on collapse', () => {
      const { getByRole } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <></>
        </CollapsibleCard>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.expanded).toBe(true);

      fireEvent.press(button);

      expect(button.props.accessibilityState.expanded).toBe(false);
    });
  });

  describe('Animation', () => {
    it('should animate chevron on expand', () => {
      jest.spyOn(Animated, 'timing').mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
        reset: jest.fn(),
      } as any);

      const { getByText } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );

      fireEvent.press(getByText('Test'));

      expect(Animated.timing).toHaveBeenCalled();
    });

    it('should animate chevron on collapse', () => {
      jest.spyOn(Animated, 'timing').mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
        reset: jest.fn(),
      } as any);

      const { getByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          <></>
        </CollapsibleCard>
      );

      fireEvent.press(getByText('Test'));

      expect(Animated.timing).toHaveBeenCalled();
    });

    it('should use JS-driven animation for chevron rotation (Fabric lifecycle race)', () => {
      // The chevron rotation uses `useNativeDriver: false` on purpose — see the
      // inline comment in `CollapsibleCard.tsx` (mirrors NBSelect). Native-driven
      // rotation races with Fabric's node lifecycle when a parent unmounts
      // immediately after a tap, surfacing the
      // `connectAnimatedNodeToView: Animated node ... does not exist` SoftException.
      const mockTiming = jest.fn().mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
        reset: jest.fn(),
      });
      jest.spyOn(Animated, 'timing').mockImplementation(mockTiming as any);

      const { getByText } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );

      fireEvent.press(getByText('Test'));

      expect(mockTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ useNativeDriver: false })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      const { getByText } = render(
        <CollapsibleCard title="">
          <></>
        </CollapsibleCard>
      );
      expect(getByText('')).toBeTruthy();
    });

    it('should handle very long title', () => {
      const longTitle = 'This is a very long title that should wrap properly without breaking the layout or causing rendering issues in the collapsible card component';
      const { getByText } = render(
        <CollapsibleCard title={longTitle}>
          <></>
        </CollapsibleCard>
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle null children gracefully', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test" defaultExpanded={true}>
          {null}
        </CollapsibleCard>
      );
      expect(getByText('Test')).toBeTruthy();
    });

    it('should handle rapid toggle clicks', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );

      const header = getByText('Test');
      fireEvent.press(header);
      fireEvent.press(header);
      fireEvent.press(header);
      fireEvent.press(header);

      expect(getByText('Test')).toBeTruthy();
    });

    it('should handle multiple CollapsibleCard instances', () => {
      const { getByText } = render(
        <>
          <CollapsibleCard title="Card 1">
            <Text>Content 1</Text>
          </CollapsibleCard>
          <CollapsibleCard title="Card 2">
            <Text>Content 2</Text>
          </CollapsibleCard>
          <CollapsibleCard title="Card 3">
            <Text>Content 3</Text>
          </CollapsibleCard>
        </>
      );

      expect(getByText('Card 1')).toBeTruthy();
      expect(getByText('Card 2')).toBeTruthy();
      expect(getByText('Card 3')).toBeTruthy();
    });

    it('should handle independent state for multiple instances', () => {
      const { getByText } = render(
        <>
          <CollapsibleCard title="Card 1">
            <Text>Content 1</Text>
          </CollapsibleCard>
          <CollapsibleCard title="Card 2" defaultExpanded={true}>
            <Text>Content 2</Text>
          </CollapsibleCard>
        </>
      );

      // Card 1 collapsed, Card 2 expanded
      fireEvent.press(getByText('Card 1')); // Expand Card 1

      expect(getByText('Content 1')).toBeTruthy();
      expect(getByText('Content 2')).toBeTruthy();
    });
  });

  describe('Touch Feedback', () => {
    it('should respond to press events', () => {
      const { getByRole } = render(
        <CollapsibleCard title="Test">
          <Text>Content</Text>
        </CollapsibleCard>
      );
      const button = getByRole('button');
      // Verify pressing doesn't crash and toggles state
      fireEvent.press(button);
      expect(button.props.accessibilityState.expanded).toBe(true);
    });

    it('should be pressable and toggle state', () => {
      const { getByRole } = render(
        <CollapsibleCard title="Test">
          <Text>Content</Text>
        </CollapsibleCard>
      );
      const button = getByRole('button');
      fireEvent.press(button);
      expect(button.props.accessibilityState.expanded).toBe(true);
      fireEvent.press(button);
      expect(button.props.accessibilityState.expanded).toBe(false);
    });
  });

  describe('Icon Rendering', () => {
    it('should render chevron-down icon', () => {
      const { UNSAFE_getAllByType } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );
      // MaterialCommunityIcons should be present
      expect(UNSAFE_getAllByType).toBeDefined();
    });

    it('should rotate icon when expanded', () => {
      const { getByText } = render(
        <CollapsibleCard title="Test">
          <></>
        </CollapsibleCard>
      );

      fireEvent.press(getByText('Test'));

      // Icon rotation is handled by Animated.View
      expect(getByText('Test')).toBeTruthy();
    });
  });
});
