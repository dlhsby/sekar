/**
 * OnboardingSlide — reusable slide template for the WL-1…WL-5 carousel
 * (Phase 4 M3a, ADR-042).
 *
 * Layout:
 *   ┌─────────────────────────┐
 *   │  illustration (hero)    │
 *   ├─────────────────────────┤
 *   │  title  (display)       │
 *   │  body   (body)          │
 *   ├─────────────────────────┤
 *   │  • • ○ ○ ○   (dots)     │
 *   │  [ CTA: Lewati | Lanjut ]│
 *   └─────────────────────────┘
 *
 * Slides 1-4 use the warm-stone canvas; slide 5 (offline scene) overrides
 * via the `backgroundColor` prop. All text reads from `<NBText>` variants so
 * v2.1 typography stays consistent.
 */

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { NBText } from '../nb';
import { NBButton } from '../nb';

export interface OnboardingSlideProps {
  title: string;
  body: string;
  illustration: React.ReactNode;
  primaryLabel: string;
  onPrimaryPress: () => void;
  /** Optional secondary CTA — typically "Lewati" on slides 1-4. */
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  /** Slide index (0-based) + total for dot indicator. */
  index: number;
  total: number;
  /** Override the slide's background (WL-5 uses dark navy). */
  backgroundColor?: string;
  /** Override the text color (WL-5 dark scene reverses to white). */
  textColor?: string;
  testID?: string;
}

export function OnboardingSlide({
  title,
  body,
  illustration,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  index,
  total,
  backgroundColor,
  textColor,
  testID,
}: OnboardingSlideProps): React.JSX.Element {
  const containerStyle: ViewStyle = {
    backgroundColor: backgroundColor ?? (nbColors as Record<string, string>).paper ?? '#F5F0EB',
  };
  const dotActive = textColor ?? (nbColors as Record<string, string>).black ?? '#1C1917';
  const dotInactive = textColor
    ? 'rgba(255,255,255,0.35)'
    : (nbColors as Record<string, string>).gray400 ?? '#A8A29E';

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      <View style={styles.illustration}>{illustration}</View>

      <View style={styles.copy}>
        <NBText variant="display" style={textColor ? { color: textColor } : undefined}>
          {title}
        </NBText>
        <NBText
          variant="body"
          style={[styles.body, textColor ? { color: textColor } : undefined]}
        >
          {body}
        </NBText>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityRole="tablist">
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? dotActive : dotInactive },
              ]}
            />
          ))}
        </View>

        <View style={styles.ctaRow}>
          {secondaryLabel ? (
            <NBButton
              variant="ghost"
              onPress={onSecondaryPress}
              testID={`${testID ?? 'slide'}-secondary`}
            >
              {secondaryLabel}
            </NBButton>
          ) : (
            <View style={styles.ctaSpacer} />
          )}
          <NBButton
            variant="primary"
            onPress={onPrimaryPress}
            testID={`${testID ?? 'slide'}-primary`}
          >
            {primaryLabel}
          </NBButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: nbSpacing?.lg ?? 24,
    paddingTop: nbSpacing?.xl ?? 32,
    paddingBottom: nbSpacing?.lg ?? 24,
    justifyContent: 'space-between',
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: nbSpacing?.lg ?? 24,
  },
  copy: {
    gap: 12,
    paddingVertical: nbSpacing?.lg ?? 24,
  },
  body: {
    opacity: 0.85,
  },
  footer: {
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  ctaSpacer: {
    flex: 1,
  },
});

export default OnboardingSlide;
