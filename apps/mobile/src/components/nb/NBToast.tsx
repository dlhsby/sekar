import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ToastLib from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../i18n/config';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  nbType,
} from '../../constants/nbTokens';

export type NBToastLevel = 'info' | 'success' | 'warning' | 'danger';

export interface NBToastOptions {
  level: NBToastLevel;
  title: string;
  body?: string;
  durationMs?: number;
  persistent?: boolean;
  icon?: string;
  action?: { label: string; onPress: () => void };
}

// NB chrome config per level
const levelConfig: Record<
  NBToastLevel,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  info: {
    bg: nbColors.infoLight,
    border: nbColors.info,
    icon: 'information',
    iconColor: nbColors.info,
  },
  success: {
    bg: nbColors.successLight,
    border: nbColors.success,
    icon: 'check-circle',
    iconColor: nbColors.successDark,
  },
  warning: {
    bg: nbColors.warningLight,
    border: nbColors.warning,
    icon: 'alert',
    iconColor: nbColors.warning,
  },
  danger: {
    bg: nbColors.dangerLight,
    border: nbColors.danger,
    icon: 'alert-circle',
    iconColor: nbColors.dangerDark,
  },
};

// Custom NB-styled toast renderer
function NBToastRenderer({
  text1,
  text2,
  props,
  hide,
}: {
  text1?: string;
  text2?: string;
  props: { level: NBToastLevel; icon?: string; action?: NBToastOptions['action'] };
  hide: () => void;
}) {
  const level = props?.level ?? 'info';
  const { bg, border, icon, iconColor } = levelConfig[level];
  const iconName = props?.icon ?? icon;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, borderColor: border },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <MaterialCommunityIcons
        name={iconName}
        size={20}
        color={iconColor}
        style={styles.icon}
      />
      <View style={styles.textBlock}>
        {text1 ? (
          <Text style={styles.title}>{text1.toUpperCase()}</Text>
        ) : null}
        {text2 ? <Text style={styles.body}>{text2}</Text> : null}
      </View>
      {props?.action ? (
        <TouchableOpacity
          onPress={() => {
            props.action?.onPress();
            hide();
          }}
          style={styles.actionButton}
        >
          <Text style={styles.actionLabel}>
            {props.action.label.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={hide}
        style={styles.dismissButton}
        accessibilityLabel={i18n.t('components:ui.dismiss')}
      >
        <MaterialCommunityIcons name="close" size={16} color={nbColors.black} />
      </TouchableOpacity>
    </View>
  );
}

// Toast config registered with react-native-toast-message
export const nbToastConfig = {
  nbToast: NBToastRenderer,
};

// Provider — place once at the root of your screen or app
export function NBToastProvider() {
  return <ToastLib config={nbToastConfig} />;
}

// Static show() API
function show(options: NBToastOptions) {
  ToastLib.show({
    type: 'nbToast',
    text1: options.title,
    text2: options.body,
    visibilityTime: options.persistent
      ? Number.MAX_SAFE_INTEGER
      : (options.durationMs ?? 4000),
    position: 'bottom',
    bottomOffset: 80,
    props: {
      level: options.level,
      icon: options.icon,
      action: options.action,
    },
  });
}

function hide() {
  ToastLib.hide();
}

export const NBToast = { show, hide };

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: nbSpacing.lg,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    ...nbShadows.md,
    minHeight: 48,
  },
  icon: {
    marginRight: nbSpacing.sm,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    paddingRight: nbSpacing.xs,
  },
  title: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: nbType.caption.fontSize,
    color: nbColors.gray700,
    marginTop: 2,
  },
  actionButton: {
    marginLeft: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 4,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
  },
  actionLabel: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
  },
  dismissButton: {
    marginLeft: nbSpacing.xs,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
