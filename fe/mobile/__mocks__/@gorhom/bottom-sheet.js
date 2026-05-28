const React = require('react');
const { View, FlatList, ScrollView } = require('react-native');

// Mirror real-sheet behavior: index === -1 means closed → render nothing.
// Otherwise expose a testID-tagged wrapper so assertions can find the sheet.
const BottomSheet = React.forwardRef(({ children, index, footerComponent }, ref) => {
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
  const footer = typeof footerComponent === 'function'
    ? React.createElement(footerComponent, {})
    : null;
  return React.createElement(View, { testID: 'bottom-sheet' }, children, footer);
});
BottomSheet.displayName = 'BottomSheet';

// BottomSheetModal: present()/dismiss() toggle a presented flag; dismiss() only
// fires onDismiss when it was actually presented (mirrors real gorhom behavior so
// a visible={false} mount does not spuriously call onClose).
const BottomSheetModal = React.forwardRef(({ children, footerComponent, backdropComponent, onDismiss }, ref) => {
  const [presented, setPresented] = React.useState(false);
  React.useImperativeHandle(ref, () => ({
    present: () => setPresented(true),
    dismiss: () =>
      setPresented((prev) => {
        if (prev) { onDismiss?.(); }
        return false;
      }),
    snapToIndex: () => {},
    expand: () => {},
    collapse: () => {},
    close: () => setPresented(false),
    forceClose: () => setPresented(false),
  }));
  if (!presented) {
    return null;
  }
  const backdrop = typeof backdropComponent === 'function'
    ? React.createElement(backdropComponent, {})
    : null;
  const footer = typeof footerComponent === 'function'
    ? React.createElement(footerComponent, {})
    : null;
  return React.createElement(View, { testID: 'bottom-sheet' }, backdrop, children, footer);
});
BottomSheetModal.displayName = 'BottomSheetModal';

const BottomSheetModalProvider = ({ children }) => children;

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

const BottomSheetFooter = ({ children }) =>
  React.createElement(View, { testID: 'bottom-sheet-footer' }, children);
BottomSheetFooter.displayName = 'BottomSheetFooter';

module.exports = BottomSheet;
module.exports.default = BottomSheet;
module.exports.BottomSheetScrollView = BottomSheetScrollView;
module.exports.BottomSheetView = BottomSheetView;
module.exports.BottomSheetFlatList = BottomSheetFlatList;
module.exports.BottomSheetBackdrop = BottomSheetBackdrop;
module.exports.BottomSheetFooter = BottomSheetFooter;
module.exports.BottomSheetModal = BottomSheetModal;
module.exports.BottomSheetModalProvider = BottomSheetModalProvider;
