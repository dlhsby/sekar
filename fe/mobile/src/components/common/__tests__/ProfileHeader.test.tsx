/**
 * ProfileHeader (PRF-1 identity strip) tests — name, role/rayon line, meta line,
 * avatar photo vs. initials, and graceful fallbacks.
 */
import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import { ProfileHeader } from '../ProfileHeader';
import type { User } from '../../../types/models.types';

const baseUser: User = {
  id: 'u1',
  username: 'satgas_pusat_1',
  full_name: 'Budi Santoso',
  role: 'satgas',
  created_at: '2023-02-11T00:00:00.000Z',
};

describe('ProfileHeader', () => {
  it('renders the full name', () => {
    const { getByText } = render(<ProfileHeader user={baseUser} />);
    expect(getByText('Budi Santoso')).toBeTruthy();
  });

  it('renders the role label only when no rayon is set', () => {
    const { getByText } = render(<ProfileHeader user={baseUser} />);
    expect(getByText('Satgas')).toBeTruthy();
  });

  it('joins role and rayon with a middot when rayon is present', () => {
    const { getByText } = render(
      <ProfileHeader user={{ ...baseUser, rayon: { id: 'r1', name: 'Pusat' } as any }} />,
    );
    expect(getByText('Satgas · Pusat')).toBeTruthy();
  });

  it('renders the meta line with username and joined year', () => {
    const { getByText } = render(<ProfileHeader user={baseUser} />);
    expect(getByText('@satgas_pusat_1 · sejak 2023')).toBeTruthy();
  });

  it('omits the "sejak" segment when created_at is missing', () => {
    const { getByText } = render(
      <ProfileHeader user={{ ...baseUser, created_at: undefined }} />,
    );
    expect(getByText('@satgas_pusat_1')).toBeTruthy();
  });

  it('shows the profile photo when profile_picture_url is set', () => {
    const { UNSAFE_getAllByType } = render(
      <ProfileHeader user={{ ...baseUser, profile_picture_url: 'https://cdn.x/p.jpg' }} />,
    );
    const imgs = UNSAFE_getAllByType(Image);
    expect(imgs.some((i: any) => i.props.source?.uri === 'https://cdn.x/p.jpg')).toBe(true);
  });

  it('falls back to initials when no photo is set', () => {
    const { getByText } = render(<ProfileHeader user={baseUser} />);
    expect(getByText('BS', { includeHiddenElements: true })).toBeTruthy();
  });

  it('handles a null user gracefully', () => {
    const { getAllByText, getByText } = render(<ProfileHeader user={null} />);
    // Both the name and the role label fall back to "Pengguna".
    expect(getAllByText('Pengguna').length).toBeGreaterThanOrEqual(1);
    expect(getByText('@unknown')).toBeTruthy();
  });

  it('shows "Pengguna" role label for an unknown role', () => {
    const { getByText } = render(
      <ProfileHeader user={{ ...baseUser, role: 'nope' as any }} />,
    );
    expect(getByText('Pengguna')).toBeTruthy();
  });
});
