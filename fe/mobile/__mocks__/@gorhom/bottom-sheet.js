const React = require('react');
const { View, FlatList, ScrollView } = require('react-native');

// Mirror real-sheet behavior: index === -1 means closed → render nothing.
// Otherwise expose a testID-tagged wrapper so assertions can find the sheet.
const BottomSheet = React.forwardRef(({ children, index }, ref) => {
  React.useImperativeHandle(ref, () => ({
    snapToIndex: () => {},
    snapToPosition: () => {},
    expand: () => {},
    collapse: () => {},
    close: () => {},
    forceClose: () => {},
  }));
  if (index === -1 || index === undefined) {
    return null;
  }
  return React.createElement(View, { testID: 'bottom-sheet' }, children);
});
BottomSheet.displayName = 'BottomSheet';

const BottomSheetScrollView = ({ children, ...rest }) =>
  React.createElement(ScrollView, { testID: 'bottom-sheet-scroll-view', ...rest }, children);
BottomSheetScrollView.displayName = 'BottomSheetScrollView';

const BottomSheetView = ({ children, ...rest }) =>
  React.createElement(View, { testID: 'bottom-sheet-view', ...rest }, children);
BottomSheetView.displayName = 'BottomSheetView';

const BottomSheetFlatList = React.forwardRef(({ ListHeaderComponent, ...props }, ref) => {
  const header = typeof ListHeaderComponent === 'function'
    ? React.createElement(ListHeaderComponent)
    : ListHeaderComponent ?? null;
  return React.createElement(FlatList, {
    ref,
    testID: 'bottom-sheet-flat-list',
    ListHeaderComponent: header,
    ...props,
  });
});
BottomSheetFlatList.displayName = 'BottomSheetFlatList';

const BottomSheetBackdrop = ({ children }) =>
  React.createElement(View, { testID: 'bottom-sheet-backdrop' }, children);
BottomSheetBackdrop.displayName = 'BottomSheetBackdrop';

module.exports = BottomSheet;
module.exports.default = BottomSheet;
module.exports.BottomSheetScrollView = BottomSheetScrollView;
module.exports.BottomSheetView = BottomSheetView;
module.exports.BottomSheetFlatList = BottomSheetFlatList;
module.exports.BottomSheetBackdrop = BottomSheetBackdrop;
