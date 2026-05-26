import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NBText } from './NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  nbTypography,
} from '../../constants/nbTokens';

export type NBModalType = 'sheet' | 'fullscreen';
export type NBModalSize = 'sm' | 'md' | 'lg';

export interface NBModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  type?: NBModalType;
  size?: NBModalSize;
  scrollable?: boolean;
  avoidKeyboard?: boolean;
  noPadding?: boolean;
  footer?: React.ReactNode;
  /** Fullscreen only: renders to the right of the title in the header bar */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

// First snap = initial open height; second (where present) = max drag-up height
const SNAP_POINTS: Record<NBModalSize, string[]> = {
  sm: ['48%'],
  md: ['65%', '88%'],
  lg: ['88%', '95%'],
};

// ─── Sheet variant (gorhom bottom sheet) ─────────────────────────────────────

function SheetModal({
  visible,
  onClose,
  title,
  size = 'md',
  scrollable = false,
  avoidKeyboard = false,
  noPadding = false,
  footer,
  children,
  testID,
}: NBModalProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => SNAP_POINTS[size ?? 'md'], [size]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
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

  // Extract title bar node to avoid duplication
  const titleBarNode = title ? (
    <View style={styles.titleBar}>
      <NBText variant="h3" color="black" style={styles.titleText}>
        {title}
      </NBText>
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
  ) : null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior={avoidKeyboard ? 'interactive' : undefined}
    >
      {scrollable ? (
        <>
          {titleBarNode}
          <BottomSheetScrollView
            testID={testID}
            style={styles.contentFlex}
            contentContainerStyle={noPadding ? styles.scrollContentNoPadding : styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </BottomSheetScrollView>
          {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
        </>
      ) : (
        <View testID={testID} style={styles.contentFlex}>
          {titleBarNode}
          <BottomSheetView style={[styles.contentFlex, noPadding ? null : styles.contentPadded]}>
            {children}
          </BottomSheetView>
          {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
        </View>
      )}
    </BottomSheet>
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
    return <FullscreenModal type={type} {...props} />;
  }
  return <SheetModal type={type} {...props} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Sheet (gorhom)
  sheetBackground: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbRadius.lg,
    borderTopRightRadius: nbRadius.lg,
    borderWidth: nbBorders.thick,
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
  contentFlex: {
    flex: 1,
  },
  contentPadded: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
  scrollContentNoPadding: {
    paddingBottom: nbSpacing.sm,
  },
  footerWrap: {
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm + 2,
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
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray200,
  },
});
