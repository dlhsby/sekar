const React = require('react');
const { View } = require('react-native');

const DateTimePicker = (props) => React.createElement(View, { testID: 'date-time-picker', ...props });

module.exports = {
  __esModule: true,
  default: DateTimePicker,
  DateTimePickerAndroid: {
    open: jest.fn(),
  },
};
