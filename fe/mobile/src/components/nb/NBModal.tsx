import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
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
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            accessibilityLabel="Kembali"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={nbColors.black} />
          </TouchableOpacity>
          {title ? (
            <NBText variant="h3" color="black" style={styles.fullscreenTitleText}>
              {title}
            </NBText>
          ) : null}
          {headerRight ? (
            <View style={styles.headerRightSlot}>{headerRight}</View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
        {inner}
      </View>
    </Modal>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function NBModal({ type = 'sheet', ...props }: NBModalProps) {
  if (type === 'fullscreen') {
    return <FullscreenModal {...props} />;
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
    borderWidth: nbBorders.base,
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
    borderBottomWidth: nbBorders.base,
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
    borderWidth: nbBorders.base,
    borderColor: nbColors.gray400,
    borderRadius: nbRadius.sm,
  },
  fixedSheetBody: {
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
    borderTopWidth: nbBorders.base,
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
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.thick,
    borderBottomColor: nbColors.black,
    ...nbShadows.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: nbSpacing.sm,
  },
  fullscreenTitleText: {
    flex: 1,
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
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
});
