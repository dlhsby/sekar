const React = require('react');
const { View } = require('react-native');

const BottomSheet = React.forwardRef(({ children }, ref) => React.createElement(View, { testID: 'bottom-sheet' }, children));
BottomSheet.displayName = 'BottomSheet';

const BottomSheetScrollView = ({ children }) => React.createElement(View, { testID: 'bottom-sheet-scroll-view' }, children);
BottomSheetScrollView.displayName = 'BottomSheetScrollView';

const BottomSheetView = ({ children }) => React.createElement(View, { testID: 'bottom-sheet-view' }, children);
BottomSheetView.displayName = 'BottomSheetView';

module.exports = BottomSheet;
module.exports.default = BottomSheet;
module.exports.BottomSheetScrollView = BottomSheetScrollView;
module.exports.BottomSheetView = BottomSheetView;
