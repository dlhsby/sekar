/**
 * Jest mock for react-native-gesture-handler.
 *
 * The package ships Flow-syntax source that our jest babel pipeline doesn't
 * transform. We only consume a tiny surface area in non-test code (currently
 * just the `ScrollView` from this package, used to coordinate horizontal
 * scroll inside @gorhom/bottom-sheet). For tests, falling back to
 * react-native's regular ScrollView is enough — gesture coordination is a
 * runtime native concern that jest doesn't simulate anyway.
 */

const RN = require('react-native');

module.exports = {
  ScrollView: RN.ScrollView,
  FlatList: RN.FlatList,
  TextInput: RN.TextInput,
  TouchableOpacity: RN.TouchableOpacity,
  TouchableHighlight: RN.TouchableHighlight,
  TouchableWithoutFeedback: RN.TouchableWithoutFeedback,
  TouchableNativeFeedback: RN.TouchableNativeFeedback,
  GestureHandlerRootView: ({ children }) => children,
  PanGestureHandler: ({ children }) => children,
  TapGestureHandler: ({ children }) => children,
  LongPressGestureHandler: ({ children }) => children,
  State: { BEGAN: 0, ACTIVE: 1, CANCELLED: 2, FAILED: 3, END: 4, UNDETERMINED: 5 },
  Directions: { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 },
  Gesture: {
    Pan: () => ({ onUpdate: () => ({}), onEnd: () => ({}) }),
    Tap: () => ({ onEnd: () => ({}) }),
  },
  GestureDetector: ({ children }) => children,
};
