/**
 * RoleAvatar tests — role-tinted initials fallback + profile-photo rendering.
 */
import React from 'react';
import { Image, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { RoleAvatar, roleAccent, getInitials } from '../RoleAvatar';
import { nbColors } from '../../../constants/nbTokens';

const flatten = (style: any): Record<string, any> => {
  if (Array.isArray(style)) { return Object.assign({}, ...style.map(flatten)); }
  return style ?? {};
};

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

  // ─── opaqueBlend (visual seam fix) ──────────────────────────────────────────
  //
  // The avatar box bg and the initials Text bg must paint the exact same color
  // string — otherwise Android's TextView paints a darker rect around the
  // glyphs (alpha-stacking the View's translucent fill). The opaque blend
  // returns an `rgb(...)` value so applying it twice produces the same pixel
  // value, not a stacked composite.

  describe('opaqueBlend seam fix', () => {
    it('paints the box and the initials with the same opaque rgb() fill', () => {
      const { UNSAFE_getAllByType, getByText } = render(
        <RoleAvatar name="Korlap Satu" role="korlap" />
      );
      const initials = getByText('KS', { includeHiddenElements: true });
      const initialsBg = flatten(initials.props.style).backgroundColor;
      const boxes = UNSAFE_getAllByType(View);
      const boxBg = flatten(boxes[0].props.style).backgroundColor;
      expect(initialsBg).toBeDefined();
      expect(initialsBg).toBe(boxBg);
      expect(initialsBg).toMatch(/^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/);
    });

    it('initials use the rendering knobs that suppress Android paint artifacts', () => {
      const { getByText } = render(<RoleAvatar name="Ana" role="korlap" />);
      const initials = getByText('A', { includeHiddenElements: true });
      const style = flatten(initials.props.style);
      expect(style.includeFontPadding).toBe(false);
      expect(style.textAlignVertical).toBe('center');
      expect(initials.props.allowFontScaling).toBe(false);
    });

    it('initials lineHeight matches fontSize so the glyph fills its line box', () => {
      const size = 48;
      const { getByText } = render(<RoleAvatar name="Ana" role="korlap" size={size} />);
      const initials = getByText('A', { includeHiddenElements: true });
      const style = flatten(initials.props.style);
      expect(style.fontSize).toBe(Math.round(size * 0.375));
      expect(style.lineHeight).toBe(style.fontSize);
    });
  });

  // ─── Profile-photo wiring ───────────────────────────────────────────────────

  describe('profile photo (CP1)', () => {
    it('renders an Image with the provided photoUrl, including base64 data URIs', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
      const { UNSAFE_getAllByType } = render(
        <RoleAvatar name="Ana" role="korlap" photoUrl={dataUri} />
      );
      const images = UNSAFE_getAllByType(Image);
      expect(images.some((img: any) => img.props.source?.uri === dataUri)).toBe(true);
    });

    it('falls back to initials when photoUrl is null (no Image rendered)', () => {
      const { UNSAFE_queryAllByType, getByText } = render(
        <RoleAvatar name="Korlap Satu" role="korlap" photoUrl={null} />
      );
      expect(getByText('KS', { includeHiddenElements: true })).toBeTruthy();
      expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
    });
  });

});
