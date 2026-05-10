import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
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
  children: React.ReactNode;
  testID?: string;
}

const SIZE_MAX_HEIGHT: Record<NBModalSize, string> = {
  sm: '48%',
  md: '65%',
  lg: '88%',
};

// ─── Sheet variant ────────────────────────────────────────────────────────────

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
  const maxHeight = SIZE_MAX_HEIGHT[size ?? 'md'];

  const content = scrollable ? (
    <ScrollView
      style={styles.content}
      contentContainerStyle={noPadding ? styles.scrollContentNoPadding : styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, noPadding ? null : styles.contentPadding]}>{children}</View>
  );

  const sheetCard = (
    <View
      style={[styles.sheet, { maxHeight }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => false}
      testID={testID}
    >
      {title ? (
        <View style={styles.titleBar}>
          <Text style={styles.titleText} accessibilityRole="header">
            {title.toUpperCase()}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Tutup"
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {content}
      {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kav}
          >
            {sheetCard}
          </KeyboardAvoidingView>
        ) : (
          sheetCard
        )}
      </Pressable>
    </Modal>
  );
}

// ─── Fullscreen variant ───────────────────────────────────────────────────────

function FullscreenModal({
  visible,
  onClose,
  title,
  scrollable = false,
  footer,
  children,
  testID,
}: NBModalProps) {
  const insets = useSafeAreaInsets();
  const ContentWrapper = scrollable ? ScrollView : View;
  const contentStyle = scrollable ? styles.fullscreenScroll : styles.fullscreenBody;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.fullscreenContainer}>
        <View style={[styles.fullscreenHeader, { paddingTop: insets.top + nbSpacing.md }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            accessibilityLabel="Kembali"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={nbColors.black}
            />
          </TouchableOpacity>
          {title ? (
            <Text style={styles.fullscreenTitle} accessibilityRole="header">
              {title.toUpperCase()}
            </Text>
          ) : null}
          <View style={styles.headerSpacer} />
        </View>
        <ContentWrapper style={contentStyle}>
          {children}
        </ContentWrapper>
        {footer ? <View style={styles.fullscreenFooter}>{footer}</View> : null}
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
  // Sheet
  overlay: {
    flex: 1,
    backgroundColor: nbColors.overlay,
    justifyContent: 'flex-end',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.thick,
    borderLeftWidth: nbBorders.thick,
    borderRightWidth: nbBorders.thick,
    borderColor: nbColors.black,
    borderTopLeftRadius: nbBorderRadius.md,
    borderTopRightRadius: nbBorderRadius.md,
    flexShrink: 1,
    ...nbShadows.lg,
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
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    letterSpacing: 0.8,
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    ...nbShadows.xs,
  },
  closeBtnText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
  },
  content: {
    flexShrink: 1,
  },
  contentPadding: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
  },
  scrollContentNoPadding: {},
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
  // Minimal back button — matches the unframed `arrow-left` icon used by
  // FieldHomeHeader (the chevron seen on detail permohonan / detail tugas /
  // detail aktivitas). The boxed-icon variant felt too heavy for a stack
  // back action; keep the WCAG 44×44 hit area but drop the visible chrome.
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: nbSpacing.sm,
  },
  backButtonText: {
    fontSize: nbTypography.fontSize.lg,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
  },
  fullscreenTitle: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  fullscreenBody: {
    flex: 1,
    padding: nbSpacing.lg,
  },
  fullscreenScroll: {
    flex: 1,
    paddingHorizontal: nbSpacing.lg,
  },
  fullscreenFooter: {
    paddingHorizontal: nbSpacing.lg,
    paddingBottom: nbSpacing.xl,
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray200,
  },
});
