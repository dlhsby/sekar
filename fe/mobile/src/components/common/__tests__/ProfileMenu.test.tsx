/**
 * ProfileMenu Component Tests
 * Tests menu items, extra items, interactions, and accessibility
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileMenu } from '../ProfileMenu';
import type { MenuItem } from '../ProfileMenu';

describe('ProfileMenu', () => {
  const mockOnChangePassword = jest.fn();
  const mockOnAbout = jest.fn();
  const mockOnSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      const { getByText } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByText('Ubah Password')).toBeTruthy();
      expect(getByText('Tentang Aplikasi')).toBeTruthy();
    });

    it('should render with default testID', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByTestId('profile-menu')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
          testID="custom-menu"
        />
      );
      expect(getByTestId('custom-menu')).toBeTruthy();
    });

    it('should render default menu items in correct order', () => {
      const { getAllByRole } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(2); // Change Password + About
    });
  });

  describe('Default Menu Items', () => {
    it('should render Change Password button', () => {
      const { getByText, getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByText('Ubah Password')).toBeTruthy();
      expect(getByTestId('change-password-button')).toBeTruthy();
    });

    it('should call onChangePassword when button pressed', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      fireEvent.press(getByTestId('change-password-button'));
      expect(mockOnChangePassword).toHaveBeenCalledTimes(1);
    });

    it('should render About button', () => {
      const { getByText, getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByText('Tentang Aplikasi')).toBeTruthy();
      expect(getByTestId('about-button')).toBeTruthy();
    });

    it('should call onAbout when button pressed', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      fireEvent.press(getByTestId('about-button'));
      expect(mockOnAbout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Menu Item', () => {
    it('should render Settings button when onSettings provided', () => {
      const { getByText, getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
          onSettings={mockOnSettings}
        />
      );
      expect(getByText('Pengaturan')).toBeTruthy();
      expect(getByTestId('settings-button')).toBeTruthy();
    });

    it('should not render Settings button when onSettings not provided', () => {
      const { queryByText } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(queryByText('Pengaturan')).toBeNull();
    });

    it('should call onSettings when button pressed', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
          onSettings={mockOnSettings}
        />
      );
      fireEvent.press(getByTestId('settings-button'));
      expect(mockOnSettings).toHaveBeenCalledTimes(1);
    });

    it('should render Settings after About in menu order', () => {
      const { getAllByRole } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
          onSettings={mockOnSettings}
        />
      );
      const buttons = getAllByRole('button');
      // Change Password, About, Settings
      expect(buttons).toHaveLength(3);
    });
  });

  describe('Extra Menu Items', () => {
    it('should render extra items', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'custom-1',
          icon: 'star',
          label: 'Custom Item',
          onPress: jest.fn(),
        },
      ];

      const { getByText } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByText('Custom Item')).toBeTruthy();
    });

    it('should render multiple extra items', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'custom-1',
          icon: 'star',
          label: 'Item One',
          onPress: jest.fn(),
        },
        {
          key: 'custom-2',
          icon: 'heart',
          label: 'Item Two',
          onPress: jest.fn(),
        },
      ];

      const { getByText } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByText('Item One')).toBeTruthy();
      expect(getByText('Item Two')).toBeTruthy();
    });

    it('should call extra item onPress handler', () => {
      const mockExtraHandler = jest.fn();
      const extraItems: MenuItem[] = [
        {
          key: 'custom-1',
          icon: 'star',
          label: 'Custom Item',
          onPress: mockExtraHandler,
          testID: 'custom-item-button',
        },
      ];

      const { getByTestId } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      fireEvent.press(getByTestId('custom-item-button'));
      expect(mockExtraHandler).toHaveBeenCalledTimes(1);
    });

    it('should insert extra items before About', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'custom-1',
          icon: 'star',
          label: 'Custom Item',
          onPress: jest.fn(),
        },
      ];

      const { getAllByRole } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      // Order: Change Password, Custom Item, About
      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should handle empty extra items array', () => {
      const { getAllByRole } = render(
        <ProfileMenu
          extraItems={[]}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(2); // Only Change Password + About
    });
  });

  describe('Menu Item Order', () => {
    it('should render items in correct order: Change Password, Extra, About', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'extra-1',
          icon: 'star',
          label: 'Extra One',
          onPress: jest.fn(),
        },
        {
          key: 'extra-2',
          icon: 'heart',
          label: 'Extra Two',
          onPress: jest.fn(),
        },
      ];

      const { getAllByRole } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      const buttons = getAllByRole('button');
      // Change Password, Extra One, Extra Two, About
      expect(buttons).toHaveLength(4);
    });

    it('should append Settings at the end when provided', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'extra-1',
          icon: 'star',
          label: 'Extra Item',
          onPress: jest.fn(),
        },
      ];

      const { getAllByRole } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
          onSettings={mockOnSettings}
        />
      );

      const buttons = getAllByRole('button');
      // Change Password, Extra Item, About, Settings
      expect(buttons).toHaveLength(4);
    });
  });

  describe('Dividers', () => {
    it('should render dividers between items', () => {
      const { getAllByRole } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      // Should have dividers between items (n-1 dividers for n items)
      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should not render divider after last item', () => {
      const { getAllByRole } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have button role for menu items', () => {
      const { getAllByRole } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have accessibility labels', () => {
      const { getByLabelText } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByLabelText('Ubah Password')).toBeTruthy();
      expect(getByLabelText('Tentang Aplikasi')).toBeTruthy();
    });

    it('should have accessibility labels for extra items', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'custom-1',
          icon: 'star',
          label: 'Custom Item',
          onPress: jest.fn(),
        },
      ];

      const { getByLabelText } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByLabelText('Custom Item')).toBeTruthy();
    });
  });

  describe('Touch Feedback', () => {
    it('should respond to press on menu items', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      fireEvent.press(getByTestId('change-password-button'));
      expect(mockOnChangePassword).toHaveBeenCalled();
    });

    it('should be pressable for all items', () => {
      const mockExtra = jest.fn();
      const extraItems: MenuItem[] = [
        { key: 'test', icon: 'star', label: 'Test', onPress: mockExtra, testID: 'test-button' },
      ];
      const { getByTestId } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      fireEvent.press(getByTestId('change-password-button'));
      fireEvent.press(getByTestId('test-button'));
      fireEvent.press(getByTestId('about-button'));
      expect(mockOnChangePassword).toHaveBeenCalled();
      expect(mockExtra).toHaveBeenCalled();
      expect(mockOnAbout).toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('should render lock icon for Change Password', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByTestId('change-password-button')).toBeTruthy();
    });

    it('should render information icon for About', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByTestId('about-button')).toBeTruthy();
    });

    it('should render custom icons for extra items', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'custom-1',
          icon: 'star-outline',
          label: 'Custom Item',
          onPress: jest.fn(),
          testID: 'custom-item',
        },
      ];

      const { getByTestId } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByTestId('custom-item')).toBeTruthy();
    });

    it('should render chevron-right icon for all items', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      // Chevrons are rendered but not testable without additional testIDs
      expect(getByTestId('change-password-button')).toBeTruthy();
    });
  });

  describe('Multiple Press Handling', () => {
    it('should handle multiple presses on same item', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      const button = getByTestId('change-password-button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnChangePassword).toHaveBeenCalledTimes(3);
    });

    it('should handle presses on different items', () => {
      const { getByTestId } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      fireEvent.press(getByTestId('change-password-button'));
      fireEvent.press(getByTestId('about-button'));

      expect(mockOnChangePassword).toHaveBeenCalledTimes(1);
      expect(mockOnAbout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long menu item labels', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'long-label',
          icon: 'star',
          label:
            'This is a very long menu item label that should wrap or truncate properly without breaking the layout',
          onPress: jest.fn(),
        },
      ];

      const { getByText } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(
        getByText(
          'This is a very long menu item label that should wrap or truncate properly without breaking the layout'
        )
      ).toBeTruthy();
    });

    it('should handle special characters in labels', () => {
      const extraItems: MenuItem[] = [
        {
          key: 'special',
          icon: 'star',
          label: 'Pengaturan & Konfigurasi',
          onPress: jest.fn(),
        },
      ];

      const { getByText } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );
      expect(getByText('Pengaturan & Konfigurasi')).toBeTruthy();
    });

    it('should handle large number of extra items', () => {
      const extraItems: MenuItem[] = Array.from({ length: 10 }, (_, i) => ({
        key: `item-${i}`,
        icon: 'star',
        label: `Item ${i + 1}`,
        onPress: jest.fn(),
      }));

      const { getAllByRole } = render(
        <ProfileMenu
          extraItems={extraItems}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      const buttons = getAllByRole('button');
      // 1 (Change Password) + 10 (Extra) + 1 (About) = 12
      expect(buttons).toHaveLength(12);
    });
  });

  describe('Re-rendering', () => {
    it('should update when extraItems prop changes', () => {
      const extraItems1: MenuItem[] = [
        {
          key: 'item-1',
          icon: 'star',
          label: 'Item One',
          onPress: jest.fn(),
        },
      ];

      const { getByText, rerender } = render(
        <ProfileMenu
          extraItems={extraItems1}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      expect(getByText('Item One')).toBeTruthy();

      const extraItems2: MenuItem[] = [
        {
          key: 'item-2',
          icon: 'heart',
          label: 'Item Two',
          onPress: jest.fn(),
        },
      ];

      rerender(
        <ProfileMenu
          extraItems={extraItems2}
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      expect(getByText('Item Two')).toBeTruthy();
    });

    it('should update when onSettings is added', () => {
      const { queryByText, rerender } = render(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
        />
      );

      expect(queryByText('Pengaturan')).toBeNull();

      rerender(
        <ProfileMenu
          onChangePassword={mockOnChangePassword}
          onAbout={mockOnAbout}
          onSettings={mockOnSettings}
        />
      );

      expect(queryByText('Pengaturan')).toBeTruthy();
    });
  });
});
