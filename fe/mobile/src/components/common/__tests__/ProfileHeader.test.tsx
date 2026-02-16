/**
 * ProfileHeader Component Tests
 * Tests user avatar, name display, role badge, and edge cases
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileHeader } from '../ProfileHeader';
import type { User } from '../../../types/models.types';

// Mock user data
const mockUser: User = {
  id: '1',
  username: 'testuser',
  full_name: 'Test User',
  role: 'satgas',
  email: 'test@example.com',
  phone_number: '081234567890',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ProfileHeader', () => {
  describe('Basic Rendering', () => {
    it('should render with user data', () => {
      const { getByText } = render(<ProfileHeader user={mockUser} />);
      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('@testuser')).toBeTruthy();
    });

    it('should render with null user', () => {
      const { getAllByText, getByText } = render(<ProfileHeader user={null} />);
      // 'Pengguna' appears as both full_name and role badge when user is null
      expect(getAllByText('Pengguna')).toHaveLength(2);
      expect(getByText('@unknown')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <ProfileHeader user={mockUser} testID="custom-header" />
      );
      expect(getByTestId('custom-header')).toBeTruthy();
    });

    it('should render with default testID', () => {
      const { getByTestId } = render(<ProfileHeader user={mockUser} />);
      expect(getByTestId('profile-header')).toBeTruthy();
    });
  });

  describe('Avatar Display', () => {
    it('should display initials for full name with two words', () => {
      const { getByText } = render(<ProfileHeader user={mockUser} />);
      expect(getByText('TU')).toBeTruthy();
    });

    it('should display first two letters for single word name', () => {
      const user = { ...mockUser, full_name: 'John' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('JO')).toBeTruthy();
    });

    it('should display first letter of first and last name', () => {
      const user = { ...mockUser, full_name: 'Alice Bob Charlie' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('AB')).toBeTruthy();
    });

    it('should display uppercase initials', () => {
      const user = { ...mockUser, full_name: 'alice bob' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('AB')).toBeTruthy();
    });

    it('should display ?? for null full_name', () => {
      const user = { ...mockUser, full_name: undefined } as any;
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('??')).toBeTruthy();
    });

    it('should handle empty string full_name', () => {
      const user = { ...mockUser, full_name: '' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('??')).toBeTruthy();
    });

    it('should handle single character name', () => {
      const user = { ...mockUser, full_name: 'A' };
      const { getAllByText } = render(<ProfileHeader user={user} />);
      // 'A' appears as both initials and full_name
      expect(getAllByText('A')).toHaveLength(2);
    });
  });

  describe('Full Name Display', () => {
    it('should display full name', () => {
      const { getByText } = render(<ProfileHeader user={mockUser} />);
      expect(getByText('Test User')).toBeTruthy();
    });

    it('should display Pengguna for null user', () => {
      const { getAllByText } = render(<ProfileHeader user={null} />);
      // 'Pengguna' appears as both full_name and role badge when user is null
      expect(getAllByText('Pengguna')).toHaveLength(2);
    });

    it('should display Pengguna for undefined full_name', () => {
      const user = { ...mockUser, full_name: undefined } as any;
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Pengguna')).toBeTruthy();
    });

    it('should display long full names', () => {
      const user = {
        ...mockUser,
        full_name: 'Very Long Full Name That Should Be Displayed Correctly',
      };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Very Long Full Name That Should Be Displayed Correctly')).toBeTruthy();
    });
  });

  describe('Username Display', () => {
    it('should display username with @ prefix', () => {
      const { getByText } = render(<ProfileHeader user={mockUser} />);
      expect(getByText('@testuser')).toBeTruthy();
    });

    it('should display @unknown for null user', () => {
      const { getByText } = render(<ProfileHeader user={null} />);
      expect(getByText('@unknown')).toBeTruthy();
    });

    it('should display @unknown for undefined username', () => {
      const user = { ...mockUser, username: undefined } as any;
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('@unknown')).toBeTruthy();
    });

    it('should handle empty string username', () => {
      const user = { ...mockUser, username: '' };
      const { getByText } = render(<ProfileHeader user={user} />);
      // Empty string is falsy, so component shows '@unknown'
      expect(getByText('@unknown')).toBeTruthy();
    });

    it('should handle long usernames', () => {
      const user = { ...mockUser, username: 'verylongusernamethatshouldbedisplayed' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('@verylongusernamethatshouldbedisplayed')).toBeTruthy();
    });
  });

  describe('Role Badge Display', () => {
    it('should display Satgas for satgas role', () => {
      const user = { ...mockUser, role: 'satgas' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Satgas')).toBeTruthy();
    });

    it('should display Linmas for linmas role', () => {
      const user = { ...mockUser, role: 'linmas' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Linmas')).toBeTruthy();
    });

    it('should display Korlap for korlap role', () => {
      const user = { ...mockUser, role: 'korlap' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Korlap')).toBeTruthy();
    });

    it('should display Admin Data for admin_data role', () => {
      const user = { ...mockUser, role: 'admin_data' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Admin Data')).toBeTruthy();
    });

    it('should display Kepala Rayon for kepala_rayon role', () => {
      const user = { ...mockUser, role: 'kepala_rayon' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Kepala Rayon')).toBeTruthy();
    });

    it('should display Top Management for top_management role', () => {
      const user = { ...mockUser, role: 'top_management' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Top Management')).toBeTruthy();
    });

    it('should display Admin Sistem for admin_system role', () => {
      const user = { ...mockUser, role: 'admin_system' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Admin Sistem')).toBeTruthy();
    });

    it('should display Superadmin for superadmin role', () => {
      const user = { ...mockUser, role: 'superadmin' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Superadmin')).toBeTruthy();
    });

    it('should display Pengguna for null user role', () => {
      const { getAllByText } = render(<ProfileHeader user={null} />);
      // 'Pengguna' appears as both full_name and role badge when user is null
      expect(getAllByText('Pengguna')).toHaveLength(2);
    });

    it('should display Pengguna for undefined role', () => {
      const user = { ...mockUser, role: undefined } as any;
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Pengguna')).toBeTruthy();
    });

    it('should display Pengguna for unknown role', () => {
      const user = { ...mockUser, role: 'unknown_role' as any };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('Pengguna')).toBeTruthy();
    });
  });

  describe('Layout and Styling', () => {
    it('should render avatar container', () => {
      const { getByText } = render(<ProfileHeader user={mockUser} />);
      const initials = getByText('TU');
      expect(initials.parent).toBeTruthy();
    });

    it('should render all sections in correct order', () => {
      const { getByTestId } = render(<ProfileHeader user={mockUser} />);
      const header = getByTestId('profile-header');
      expect(header).toBeTruthy();
      // Avatar, full name, username, role badge should all be children
    });

    it('should center align content', () => {
      const { getByTestId } = render(<ProfileHeader user={mockUser} />);
      const header = getByTestId('profile-header');
      expect(header.props.style).toEqual(
        expect.objectContaining({
          alignItems: 'center',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in names', () => {
      const user = { ...mockUser, full_name: "O'Brien-Smith" };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText("O'Brien-Smith")).toBeTruthy();
    });

    it('should handle names with accents', () => {
      const user = { ...mockUser, full_name: 'José María' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('José María')).toBeTruthy();
      expect(getByText('JM')).toBeTruthy();
    });

    it('should handle numbers in names', () => {
      const user = { ...mockUser, full_name: 'User123 Test456' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('User123 Test456')).toBeTruthy();
      expect(getByText('UT')).toBeTruthy();
    });

    it('should handle whitespace-only full_name', () => {
      const user = { ...mockUser, full_name: '   ' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('   ')).toBeTruthy();
    });

    it('should handle multiple spaces in name', () => {
      const user = { ...mockUser, full_name: 'John    Doe' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('John    Doe')).toBeTruthy();
    });

    it('should handle trailing spaces in name', () => {
      const user = { ...mockUser, full_name: 'John Doe   ' };
      const { getByText } = render(<ProfileHeader user={user} />);
      expect(getByText('John Doe   ')).toBeTruthy();
    });
  });

  describe('Multiple Instances', () => {
    it('should render multiple ProfileHeaders independently', () => {
      const user1 = { ...mockUser, full_name: 'User One', username: 'user1' };
      const user2 = { ...mockUser, full_name: 'User Two', username: 'user2' };

      const { getByText } = render(
        <>
          <ProfileHeader user={user1} testID="header-1" />
          <ProfileHeader user={user2} testID="header-2" />
        </>
      );

      expect(getByText('User One')).toBeTruthy();
      expect(getByText('@user1')).toBeTruthy();
      expect(getByText('User Two')).toBeTruthy();
      expect(getByText('@user2')).toBeTruthy();
    });

    it('should maintain separate testIDs for multiple instances', () => {
      const { getByTestId } = render(
        <>
          <ProfileHeader user={mockUser} testID="header-1" />
          <ProfileHeader user={mockUser} testID="header-2" />
        </>
      );

      expect(getByTestId('header-1')).toBeTruthy();
      expect(getByTestId('header-2')).toBeTruthy();
    });
  });

  describe('Re-rendering', () => {
    it('should update when user prop changes', () => {
      const user1 = { ...mockUser, full_name: 'Original Name' };
      const { getByText, rerender } = render(<ProfileHeader user={user1} />);

      expect(getByText('Original Name')).toBeTruthy();

      const user2 = { ...mockUser, full_name: 'Updated Name' };
      rerender(<ProfileHeader user={user2} />);

      expect(getByText('Updated Name')).toBeTruthy();
    });

    it('should update when role changes', () => {
      const user1 = { ...mockUser, role: 'satgas' };
      const { getByText, rerender } = render(<ProfileHeader user={user1} />);

      expect(getByText('Satgas')).toBeTruthy();

      const user2 = { ...mockUser, role: 'korlap' };
      rerender(<ProfileHeader user={user2} />);

      expect(getByText('Korlap')).toBeTruthy();
    });

    it('should handle switching from user to null', () => {
      const { getAllByText, getByText, rerender } = render(<ProfileHeader user={mockUser} />);

      expect(getByText('Test User')).toBeTruthy();

      rerender(<ProfileHeader user={null} />);

      // 'Pengguna' appears as both full_name and role badge when user is null
      expect(getAllByText('Pengguna')).toHaveLength(2);
      expect(getByText('@unknown')).toBeTruthy();
    });
  });
});
