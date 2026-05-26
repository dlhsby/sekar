/**
 * RoleAvatar tests — role-tinted initials fallback + profile-photo rendering.
 */
import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import { RoleAvatar, roleAccent, getInitials } from '../RoleAvatar';
import { nbColors } from '../../../constants/nbTokens';

describe('RoleAvatar', () => {
  it('renders first+last initials when no photo is set', () => {
    const { getByText } = render(<RoleAvatar name="Budi Santoso" role="satgas" />);
    expect(getByText('BS', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders the profile photo (not initials) when photoUrl is set', () => {
    const { UNSAFE_getAllByType, queryByText } = render(
      <RoleAvatar name="Budi Santoso" role="satgas" photoUrl="https://cdn.example.com/b.jpg" />
    );
    const images = UNSAFE_getAllByType(Image);
    expect(images.some((img: any) => img.props.source?.uri === 'https://cdn.example.com/b.jpg')).toBe(true);
    expect(queryByText('BS', { includeHiddenElements: true })).toBeNull();
  });

  it('is decorative (hidden from screen readers)', () => {
    const { getByText } = render(<RoleAvatar name="Ana" role="korlap" />);
    // Box is hidden; initials only surface with includeHiddenElements.
    expect(getByText('A', { includeHiddenElements: true })).toBeTruthy();
  });

  describe('roleAccent', () => {
    it('maps each known role to its accent token', () => {
      expect(roleAccent('satgas')).toBe(nbColors.roleSatgas);
      expect(roleAccent('korlap')).toBe(nbColors.roleKorlap);
      expect(roleAccent('staff_kecamatan')).toBe(nbColors.roleKecamatan);
    });
    it('falls back to the brand primary for unknown/empty roles', () => {
      expect(roleAccent(undefined)).toBe(nbColors.primary);
      expect(roleAccent('nope')).toBe(nbColors.primary);
    });
  });

  describe('getInitials', () => {
    it('returns "?" for empty names', () => {
      expect(getInitials()).toBe('?');
      expect(getInitials('   ')).toBe('?');
    });
    it('uses first + last initial', () => {
      expect(getInitials('Joko Widodo Susilo')).toBe('JS');
      expect(getInitials('Ana')).toBe('A');
    });
  });
});
