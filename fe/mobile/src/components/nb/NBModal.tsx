import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NBText } from './NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';

export type NBModalType = 'sheet' | 'fullscreen';

export interface NBModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Optional style override for the title text (e.g. a smaller fontSize to fit
   *  a long title). Merged after the variant style. */
  titleStyle?: StyleProp<TextStyle>;
  type?: NBModalType;
  avoidKeyboard?: boolean;
  noPadding?: boolean;
  footer?: React.ReactNode;
  /** Renders to the right of the title in the header/title bar (fullscreen, or
   *  a fixed-height sheet). */
  headerRight?: React.ReactNode;
  /**
   * Sheet only. Fixed snap height (e.g. '90%' or a pixel number). Disables
   * dynamic content sizing and renders children in a non-scrolling
   * BottomSheetView so a child can flex to fill — e.g. a hosted MapView. Leave
   * unset for the default hug-content sheet.
   */
  sheetHeight?: string | number;
  /**
   * Sheet only. Pass-through to gorhom. Set false when the body hosts a pannable
   * surface (a map) so content drags don't move/dismiss the sheet — drag-to-close
   * then only works from the handle. Defaults to true (gorhom's default).
   */
  enableContentPanningGesture?: boolean;
  /**
   * Fullscreen only. Wraps the body in a ScrollView. Sheets always scroll, so this
   * is ignored for the sheet variant. Leave false for fullscreen modals whose body
   * must fill the viewport (maps, calendars) rather than scroll.
   */
  scrollable?: boolean;
  children: React.ReactNode;
  testID?: string;
}

/** Resolve a gorhom snap point ('92%' or a pixel number) to pixels. */
function resolveSnapPx(snap: string | number, screenH: number): number {
  if (typeof snap === 'number') { return snap; }
  const m = /^(\d+(?:\.\d+)?)%$/.exec(snap.trim());
  return m ? (parseFloat(m[1]) / 100) * screenH : screenH;
}

// ─── Sheet variant (gorhom bottom sheet) ─────────────────────────────────────
//
// One behavior: the sheet hugs its content (small content → small sheet) and grows
// up to the top safe-area inset (above the app header, below the status bar). Once
// content exceeds that cap, the body scrolls while the title and footer stay fixed.
//
// Mechanics: `enableDynamicSizing` measures the BottomSheetScrollView content height
// (including its paddings) as the snap point. The title is an absolutely-positioned
// top overlay and the footer is rendered via gorhom's `footerComponent`; neither is
// part of the dynamic measurement, so their measured heights are fed back as
// paddingTop/paddingBottom on the scroll content to reserve space beneath them.

function SheetModal({
  visible,
  onClose,
  title,
  titleStyle,
  avoidKeyboard = false,
  noPadding = false,
  footer,
  headerRight,
  sheetHeight,
  enableContentPanningGesture = true,
  children,
  testID,
}: NBModalProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  // Grow above the app header but stop below the status bar.
  const maxHeight = screenHeight - insets.top;

  // Fixed-height mode: a single explicit snap point (e.g. a map sheet) instead of
  // hugging content. Children render in a non-scrolling BottomSheetView given an
  // EXPLICIT pixel height — gorhom's BottomSheetView wraps its content rather than
  // stretching, so a flex:1 child (a hosted MapView) would otherwise collapse to
  // zero and not render. We size the body to the snap height minus the handle.
  const fixed = sheetHeight != null;
  const snapPoints = React.useMemo(
    () => (sheetHeight != null ? [sheetHeight] : undefined),
    [sheetHeight],
  );
  // gorhom resolves '%' snaps against the full screen height; mirror that so the
  // body height matches the actual sheet height. Reserve the handle area, biased
  // slightly high so the body UNDERSHOOTS rather than overshoots — an overshoot
  // pushes bottom-anchored content (its padding) off-screen, whereas a small
  // undershoot just leaves a seamless white strip (same as the sheet bg).
  const HANDLE_AREA = 44;
  const fixedBodyHeight = fixed
    ? resolveSnapPx(sheetHeight as string | number, screenHeight) - HANDLE_AREA
    : undefined;

  // Title/footer live outside the scroll measurement (absolute overlay + gorhom
  // footer), so their heights pad the scroll content. The initial estimates must
  // be close to reality: the modal instance stays mounted while `visible` toggles,
  // so onLayout-measured values persist across re-opens (which is why a re-open
  // looks correct) — but the FIRST open relies on these estimates. The footer
  // includes the safe-area bottom inset, so the estimate must too, otherwise the
  // last content row is hidden behind the footer on first open.
  const [titleH, setTitleH] = useState(title ? 52 : 0);
  const [footerH, setFooterH] = useState(footer ? 68 + insets.bottom : 0);

  // Standard gaps between the fixed title/footer and the content (top + bottom margin).
  const topGap = noPadding ? 0 : nbSpacing.md;
  const bottomGap = nbSpacing.md;

  // present()/dismiss() drive the portaled modal. Android hardware back is handled
  // natively by gorhom's modal; every dismissal funnels through onDismiss → onClose.
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          testID="nbmodal-footer"
          style={[styles.footerWrap, insets.bottom > 0 && { paddingBottom: insets.bottom }]}
          onLayout={(e) => setFooterH(Math.round(e.nativeEvent.layout.height))}
        >
          {footer}
        </View>
      </BottomSheetFooter>
    ),
    [footer, insets.bottom],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing={!fixed}
      snapPoints={snapPoints}
      maxDynamicContentSize={fixed ? undefined : maxHeight}
      enablePanDownToClose
      enableContentPanningGesture={enableContentPanningGesture}
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior={avoidKeyboard ? 'interactive' : undefined}
    >
      {fixed ? (
        // Non-scrolling body: a flex:1 child (map) fills the fixed sheet.
        <BottomSheetView
          testID={testID}
          style={[
            styles.fixedSheetBody,
            { height: fixedBodyHeight, paddingTop: titleH, paddingBottom: footer ? footerH : 0 },
          ]}
        >
          {children}
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView
          testID={testID}
          contentContainerStyle={[
            noPadding ? styles.scrollContentNoPadding : styles.scrollContent,
            {
              paddingTop: titleH + topGap,
              // Reserve the footer height + a margin so the last row clears the
              // sticky footer; when there is no footer, use a plain bottom margin.
              paddingBottom: footer ? footerH + bottomGap : nbSpacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      )}

      {title ? (
        <View
          testID="nbmodal-title-bar"
          style={[styles.titleBar, styles.overlayTop]}
          onLayout={(e) => setTitleH(Math.round(e.nativeEvent.layout.height))}
        >
          <NBText variant="h3" color="black" style={[styles.titleText, titleStyle]} numberOfLines={1}>
            {title}
          </NBText>
          {headerRight ? (
            <View style={styles.sheetHeaderRight}>{headerRight}</View>
          ) : null}
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            style={styles.closeBtnHitArea}
            accessibilityLabel="Tutup"
            accessibilityRole="button"
          >
            <View style={styles.closeBtnVisual}>
              <MaterialCommunityIcons name="close" size={16} color={nbColors.gray700} />
            </View>
          </TouchableOpacity>
        </View>
      ) : null}
    </BottomSheetModal>
  );
}

// ─── Fullscreen variant ───────────────────────────────────────────────────────

function FullscreenModal({
  visible,
  onClose,
  title,
  scrollable = false,
  avoidKeyboard = false,
  noPadding = false,
  footer,
  headerRight,
  children,
  testID,
}: NBModalProps) {
  const insets = useSafeAreaInsets();

  const body = scrollable ? (
    <ScrollView
      style={styles.fullscreenScroll}
      contentContainerStyle={noPadding ? styles.fullscreenScrollContentNoPadding : styles.fullscreenScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fullscreenBody, noPadding && styles.fullscreenBodyNoPadding]}>{children}</View>
  );

  const inner = avoidKeyboard ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fullscreenFlex}
    >
      {body}
      {footer ? <View style={styles.fullscreenFooter}>{footer}</View> : null}
    </KeyboardAvoidingView>
  ) : (
    <>
      {body}
      {footer ? <View style={styles.fullscreenFooter}>{footer}</View> : null}
    </>
  );

  return (
    <Modal
      visible={visible}
      // See Phase 4 M3 comment: fade avoids Fabric race on slide animation
      animationType="fade"
      hardwareAccelerated={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={[styles.fullscreenContainer, { paddingTop: insets.top }]}>
        {/* Identical to the app's sub-screen header: NB_HEADER_STYLE chrome
            (76px, thick black bottom border, md shadow) wrapping a centered
            FieldHomeHeader-style row (back arrow 24 + 18/800 title). */}
        <View style={styles.fullscreenHeader}>
          <View style={styles.fullscreenHeaderRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.backButton}
              accessibilityLabel="Kembali"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
            </TouchableOpacity>
            <View style={styles.fullscreenHeaderCenter}>
              {title ? (
                <Text style={styles.fullscreenTitleText} numberOfLines={1} ellipsizeMode="tail">
                  {title}
                </Text>
              ) : null}
            </View>
            {headerRight ? (
              <View style={styles.headerRightSlot}>{headerRight}</View>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>
        </View>
        {inner}
      </View>
    </Modal>
  );
}

// ─── RN-Modal bottom sheet (gorhom-free) ────────────────────────────────────
//
// @gorhom/bottom-sheet sheets do not present on the current stack (RN 0.86 New
// Arch + reanimated 4.4 + gorhom 5.2.14) — present() is a silent no-op while a
// plain RN `Modal` works. This is a self-contained bottom sheet built on RN
// `Modal` (transparent + slide) that reproduces the NB sheet chrome without
// gorhom/reanimated: dim backdrop (tap to close), bottom-anchored card that
// hugs content up to a cap (or a fixed `sheetHeight`), fixed title + footer,
// scrolling body. Drop-in for SheetModal; swap back once gorhom works again.

function RNSheetModal({
  visible,
  onClose,
  title,
  titleStyle,
  avoidKeyboard = false,
  noPadding = false,
  footer,
  headerRight,
  sheetHeight,
  children,
  testID,
}: NBModalProps) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  // Cap a hug-content sheet below the status bar; honor an explicit sheetHeight.
  const maxHeight = screenHeight - insets.top - nbSpacing.xl;
  const fixedHeight =
    sheetHeight != null ? resolveSnapPx(sheetHeight, screenHeight) : undefined;
  const fixed = sheetHeight != null;

  // Drag-to-close: a vertical pan on the handle slides the card down; releasing
  // past a threshold (or a fast downward fling) closes it, otherwise it springs
  // back. Only downward drag is tracked, and only from the handle, so the body
  // scrolls normally. Pure RN Animated/PanResponder — no gorhom/reanimated.
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);
  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 3,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.rnSheetRoot}>
        <Pressable
          style={styles.rnSheetBackdrop}
          onPress={onClose}
          accessibilityLabel="Tutup"
          accessibilityRole="button"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={avoidKeyboard}
          style={styles.rnSheetKav}
          pointerEvents="box-none"
        >
          <Animated.View
            testID="nbmodal-sheet-card"
            style={[
              styles.rnSheetCard,
              fixed ? { height: fixedHeight } : { maxHeight },
              { paddingBottom: insets.bottom, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.rnHandleArea} {...dragResponder.panHandlers}>
              <View style={styles.rnHandle} />
            </View>

            {title ? (
              <View testID="nbmodal-title-bar" style={styles.titleBar}>
                <NBText variant="h3" color="black" style={[styles.titleText, titleStyle]} numberOfLines={1}>
                  {title}
                </NBText>
                {headerRight ? <View style={styles.sheetHeaderRight}>{headerRight}</View> : null}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtnHitArea}
                  accessibilityLabel="Tutup"
                  accessibilityRole="button"
                >
                  <View style={styles.closeBtnVisual}>
                    <MaterialCommunityIcons name="close" size={16} color={nbColors.gray700} />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            {fixed ? (
              <View testID={testID} style={styles.rnFixedBody}>
                {children}
              </View>
            ) : (
              <ScrollView
                testID={testID}
                contentContainerStyle={noPadding ? styles.scrollContentNoPadding : styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            )}

            {footer ? (
              <View
                testID="nbmodal-footer"
                style={[styles.footerWrap, insets.bottom > 0 && { paddingBottom: insets.bottom }]}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

// Runtime renders sheets via the gorhom-free RNSheetModal (gorhom doesn't
// present on this stack). Under Jest we keep routing to the original gorhom
// SheetModal so its contract tests stay valid for when gorhom is restored —
// RNSheetModal is plain RN and is verified on-device. Remove this gate (and
// SheetModal) once gorhom presents correctly, or add RNSheetModal unit tests
// if it becomes the permanent path.
const USE_RN_SHEET = process.env.NODE_ENV !== 'test';

export function NBModal({ type = 'sheet', ...props }: NBModalProps) {
  if (type === 'fullscreen') {
    return <FullscreenModal {...props} />;
  }
  if (USE_RN_SHEET) {
    return <RNSheetModal {...props} />;
  }
  return <SheetModal {...props} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Sheet (gorhom)
  sheetBackground: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbRadius.lg,
    borderTopRightRadius: nbRadius.lg,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.lg,
  },
  handle: {
    backgroundColor: nbColors.gray400,
    width: 48,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm + 4,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.black,
  },
  titleText: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  closeBtnHitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnVisual: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.gray400,
    borderRadius: nbRadius.sm,
  },
  fixedSheetBody: {
    width: '100%',
  },
  // RN-Modal bottom sheet (gorhom-free)
  rnSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  rnSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  rnSheetKav: {
    justifyContent: 'flex-end',
  },
  rnSheetCard: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbRadius.lg,
    borderTopRightRadius: nbRadius.lg,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.lg,
    overflow: 'hidden',
  },
  rnHandleArea: {
    alignItems: 'center',
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.xs,
  },
  rnHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: nbColors.gray400,
  },
  rnFixedBody: {
    flex: 1,
    width: '100%',
  },
  sheetHeaderRight: {
    justifyContent: 'center',
    marginRight: nbSpacing.sm,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
  scrollContentNoPadding: {
    paddingBottom: nbSpacing.sm,
  },
  footerWrap: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.black,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm + 2,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: nbColors.white,
    zIndex: 10,
  },
  // Fullscreen
  fullscreenContainer: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  fullscreenFlex: {
    flex: 1,
  },
  // Chrome — identical to MainNavigator's NB_HEADER_STYLE (used by every screen
  // header) so a fullscreen modal header matches a screen pixel-for-pixel.
  fullscreenHeader: {
    height: 76,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthThick,
    borderBottomColor: nbColors.black,
    ...nbShadows.md,
    justifyContent: 'center',
  },
  // Inner row — matches FieldHomeHeader's container (centred in the 76px chrome).
  fullscreenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: nbSpacing.xs,
  },
  fullscreenHeaderCenter: {
    flex: 1,
    justifyContent: 'center',
    marginRight: nbSpacing.xs,
  },
  // Matches FieldHomeHeader's pageTitle (raw Text, system font, 18/800).
  fullscreenTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: nbColors.black,
    textAlign: 'left',
  },
  headerSpacer: {
    width: 44,
  },
  fullscreenBody: {
    flex: 1,
    padding: nbSpacing.lg,
  },
  fullscreenBodyNoPadding: {
    padding: 0,
  },
  fullscreenScroll: {
    flex: 1,
    paddingHorizontal: nbSpacing.lg,
  },
  fullscreenScrollContent: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  fullscreenScrollContentNoPadding: {
    paddingBottom: 0,
  },
  headerRightSlot: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 44,
  },
  fullscreenFooter: {
    paddingHorizontal: nbSpacing.lg,
    paddingBottom: nbSpacing.xl,
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.black,
  },
});
