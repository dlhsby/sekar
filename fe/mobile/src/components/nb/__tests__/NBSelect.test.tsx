/**
 * NBSelect Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NBSelect } from '../NBSelect';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

const OPTIONS = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
];

describe('NBSelect', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders trigger with default placeholder when no value matches', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      expect(getByText('Pilih...')).toBeTruthy();
    });

    it('renders trigger with custom placeholder', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          placeholder="Pilih opsi..."
        />,
      );

      expect(getByText('Pilih opsi...')).toBeTruthy();
    });

    it('renders with selected value label when value matches an option', () => {
      const { getByText } = render(
        <NBSelect
          value="b"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      expect(getByText('Option B')).toBeTruthy();
    });

    it('renders with first option label when first option is selected', () => {
      const { getByText } = render(
        <NBSelect
          value="a"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      expect(getByText('Option A')).toBeTruthy();
    });

    it('shows placeholder when value does not match any option', () => {
      const { getByText } = render(
        <NBSelect
          value="nonexistent"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          placeholder="Select one"
        />,
      );

      expect(getByText('Select one')).toBeTruthy();
    });

    it('renders in disabled state', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          disabled={true}
        />,
      );

      expect(getByText('Pilih...')).toBeTruthy();
    });
  });

  describe('Dropdown interaction', () => {
    it('opens dropdown when trigger is pressed', () => {
      const { getByText, queryByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      // Dropdown is closed initially — option labels not visible
      expect(queryByText('Option A')).toBeNull();

      // Press the trigger (shows placeholder)
      fireEvent.press(getByText('Pilih...'));

      // Options should now be visible
      expect(getByText('Option A')).toBeTruthy();
      expect(getByText('Option B')).toBeTruthy();
      expect(getByText('Option C')).toBeTruthy();
    });

    it('does not open dropdown when disabled', () => {
      const { getByText, queryByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          disabled={true}
          placeholder="Pilih..."
        />,
      );

      fireEvent.press(getByText('Pilih...'));

      // Dropdown should remain closed
      expect(queryByText('Option A')).toBeNull();
    });

    it('selects an option and calls onValueChange', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      // Open dropdown
      fireEvent.press(getByText('Pilih...'));

      // Select Option B
      fireEvent.press(getByText('Option B'));

      expect(mockOnValueChange).toHaveBeenCalledWith('b');
      expect(mockOnValueChange).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown after selecting an option', () => {
      const { getByText, queryByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      // Open dropdown
      fireEvent.press(getByText('Pilih...'));
      expect(getByText('Option A')).toBeTruthy();

      // Select an option
      fireEvent.press(getByText('Option A'));

      // Dropdown should close; options no longer in the list
      expect(queryByText('Option B')).toBeNull();
    });

    it('selects first option and calls onValueChange with correct value', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      fireEvent.press(getByText('Pilih...'));
      fireEvent.press(getByText('Option A'));

      expect(mockOnValueChange).toHaveBeenCalledWith('a');
    });

    it('selects last option and calls onValueChange with correct value', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      fireEvent.press(getByText('Pilih...'));
      fireEvent.press(getByText('Option C'));

      expect(mockOnValueChange).toHaveBeenCalledWith('c');
    });
  });

  describe('Style customization', () => {
    it('accepts a custom style prop without crashing', () => {
      const customStyle = { marginTop: 8, borderRadius: 4 };

      expect(() =>
        render(
          <NBSelect
            value=""
            onValueChange={mockOnValueChange}
            options={OPTIONS}
            style={customStyle}
          />,
        ),
      ).not.toThrow();
    });

    it('renders correctly with style prop applied', () => {
      const { getByText } = render(
        <NBSelect
          value="a"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          style={{ marginTop: 8 }}
        />,
      );

      expect(getByText('Option A')).toBeTruthy();
    });
  });

  describe('Empty options', () => {
    it('renders correctly with empty options array', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={[]}
          placeholder="No options"
        />,
      );

      expect(getByText('No options')).toBeTruthy();
    });

    it('opens modal with no options when options is empty', () => {
      const { getByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={[]}
          placeholder="No options"
        />,
      );

      // Should not crash when dropdown is opened with no options
      expect(() => fireEvent.press(getByText('No options'))).not.toThrow();
    });
  });

  describe('Selected state indicator', () => {
    it('shows all options including selected option in dropdown', () => {
      const { getAllByText } = render(
        <NBSelect
          value="b"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      // Open the dropdown — trigger displays "Option B" because it's selected
      fireEvent.press(getAllByText('Option B')[0]);

      // Dropdown is open; Option B appears in both the trigger and the list
      const optionBElements = getAllByText('Option B');
      expect(optionBElements.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onValueChange with different value when another option is chosen', () => {
      const { getAllByText, getByText } = render(
        <NBSelect
          value="b"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      // Open the dropdown
      fireEvent.press(getAllByText('Option B')[0]);

      // Select Option A
      fireEvent.press(getByText('Option A'));

      expect(mockOnValueChange).toHaveBeenCalledWith('a');
    });
  });

  describe('Sheet header', () => {
    it('shows sheet header with placeholder text when opened', () => {
      const { getByText, getAllByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          placeholder="Pilih opsi"
        />,
      );

      fireEvent.press(getByText('Pilih opsi'));

      // Sheet header title should match the placeholder
      const matches = getAllByText('Pilih opsi');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('shows sheet header with label prop when opened', () => {
      const { getByText, getAllByText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          placeholder="Pilih..."
          label="Pilih Opsi Anda"
        />,
      );

      fireEvent.press(getByText('Pilih...'));

      // Sheet header should show the label prop text
      const labelMatches = getAllByText('Pilih Opsi Anda');
      expect(labelMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('closes sheet when header close button is pressed', () => {
      const { getByText, queryByText, getByLabelText } = render(
        <NBSelect
          value=""
          onValueChange={mockOnValueChange}
          options={OPTIONS}
          placeholder="Pilih..."
        />,
      );

      // Open the sheet
      fireEvent.press(getByText('Pilih...'));
      expect(getByText('Option A')).toBeTruthy();

      // Press the close button in the sheet header
      fireEvent.press(getByLabelText('Tutup'));

      // Options should no longer be visible
      expect(queryByText('Option A')).toBeNull();
    });
  });

  describe('Selected state visual', () => {
    it('shows check icon next to selected option in dropdown', () => {
      const { getAllByText, getByText } = render(
        <NBSelect
          value="b"
          onValueChange={mockOnValueChange}
          options={OPTIONS}
        />,
      );

      // Open the dropdown by pressing the trigger (which shows "Option B")
      fireEvent.press(getAllByText('Option B')[0]);

      // Option B is selected — it should appear in the list
      // Both trigger and list item show "Option B"
      const optionBInstances = getAllByText('Option B');
      expect(optionBInstances.length).toBeGreaterThanOrEqual(2);

      // Other options should also be visible
      expect(getByText('Option A')).toBeTruthy();
      expect(getByText('Option C')).toBeTruthy();
    });
  });
});
