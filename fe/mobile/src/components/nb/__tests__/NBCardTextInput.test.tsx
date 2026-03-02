/**
 * NBCardTextInput Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NBCardTextInput } from '../NBCardTextInput';

describe('NBCardTextInput', () => {
  describe('rendering', () => {
    it('renders card with title and input', () => {
      const { getByText } = render(
        <NBCardTextInput title="DESKRIPSI" value="" onChangeText={jest.fn()} />,
      );
      expect(getByText('DESKRIPSI')).toBeTruthy();
    });

    it('renders required asterisk when required={true}', () => {
      const { getByText } = render(
        <NBCardTextInput title="DESKRIPSI" required value="" onChangeText={jest.fn()} />,
      );
      expect(getByText(' *')).toBeTruthy();
    });

    it('does not render asterisk by default', () => {
      const { queryByText } = render(
        <NBCardTextInput title="DESKRIPSI" value="" onChangeText={jest.fn()} />,
      );
      expect(queryByText(' *')).toBeNull();
    });

    it('renders subtitle when provided', () => {
      const { getByText } = render(
        <NBCardTextInput
          title="CATATAN"
          subtitle="Opsional"
          value=""
          onChangeText={jest.fn()}
        />,
      );
      expect(getByText('Opsional')).toBeTruthy();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(
        <NBCardTextInput title="CATATAN" value="" onChangeText={jest.fn()} />,
      );
      expect(queryByText('Opsional')).toBeNull();
    });
  });

  describe('value and interaction', () => {
    it('displays the current value', () => {
      const { getByTestId } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value="hello world"
          onChangeText={jest.fn()}
          testID="desc-input"
        />,
      );
      const input = getByTestId('desc-input-input');
      expect(input.props.value).toBe('hello world');
    });

    it('calls onChangeText when text changes', () => {
      const handleChange = jest.fn();
      const { getByTestId } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value=""
          onChangeText={handleChange}
          testID="desc-input"
        />,
      );
      fireEvent.changeText(getByTestId('desc-input-input'), 'new text');
      expect(handleChange).toHaveBeenCalledWith('new text');
    });
  });

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      const { getByText } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value=""
          onChangeText={jest.fn()}
          error="Wajib diisi"
        />,
      );
      expect(getByText('Wajib diisi')).toBeTruthy();
    });
  });

  describe('character counter', () => {
    it('shows character count when maxLength is given', () => {
      const { getByText } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value="hello"
          onChangeText={jest.fn()}
          maxLength={200}
        />,
      );
      expect(getByText('5/200 karakter')).toBeTruthy();
    });

    it('does not show character count when maxLength is not given', () => {
      const { queryByText } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value="hello"
          onChangeText={jest.fn()}
        />,
      );
      expect(queryByText(/karakter/)).toBeNull();
    });
  });

  describe('disabled state', () => {
    it('disables the input when disabled={true}', () => {
      const { getByTestId } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value="read only"
          onChangeText={jest.fn()}
          disabled
          testID="desc-input"
        />,
      );
      const input = getByTestId('desc-input-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('testID forwarding', () => {
    it('forwards testID to the underlying input', () => {
      const { getByTestId } = render(
        <NBCardTextInput
          title="DESKRIPSI"
          value=""
          onChangeText={jest.fn()}
          testID="my-input"
        />,
      );
      expect(getByTestId('my-input-input')).toBeTruthy();
    });
  });
});
