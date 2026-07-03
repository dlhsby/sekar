/**
 * Score Gauge Component
 * Circular performance score gauge with grade indicator
 * Uses react-native-svg
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { NBText } from '../nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { Grade } from '../../types/analytics.types';

interface ScoreGaugeProps {
  score: number; // 0-100
  grade: Grade;
  size?: number;
  showLabel?: boolean;
}

// Grade color mapping
const GRADE_COLORS: Record<Grade, string> = {
  A: nbColors.success,
  B: nbColors.info,
  C: nbColors.warning,
  D: nbColors.warningLight,
  E: nbColors.danger,
  F: nbColors.danger,
};

const DEFAULT_SIZE = 140;
const CENTER_X = 70;
const CENTER_Y = 70;
const RADIUS = 50;

export function ScoreGauge({
  score,
  grade,
  size = DEFAULT_SIZE,
  showLabel = true,
}: ScoreGaugeProps): React.JSX.Element {
  const { t } = useTranslation();

  const GRADE_LABELS: Record<Grade, string> = {
    A: t('analytics:grade.A'),
    B: t('analytics:grade.B'),
    C: t('analytics:grade.C'),
    D: t('analytics:grade.D'),
    E: t('analytics:grade.E'),
    F: t('analytics:grade.F'),
  };

  // Clamp score to 0-100
  const normalizedScore = Math.max(0, Math.min(100, score));

  const gradeColor = GRADE_COLORS[grade];

  // Simplified gauge: use arc path instead of Arc element
  const arcPath = useMemo(() => {
    if (normalizedScore === 0) return '';
    const startRad = (-135 * Math.PI) / 180;
    const endRad = ((-135 + (normalizedScore / 100) * 270) * Math.PI) / 180;
    const x1 = CENTER_X + RADIUS * Math.cos(startRad);
    const y1 = CENTER_Y + RADIUS * Math.sin(startRad);
    const x2 = CENTER_X + RADIUS * Math.cos(endRad);
    const y2 = CENTER_Y + RADIUS * Math.sin(endRad);
    const largeArc = normalizedScore > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
  }, [normalizedScore]);

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 140 140">
          {/* Background arc (light gray) */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS}
            fill="none"
            stroke={nbColors.gray200}
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Score arc using Path */}
          {arcPath && (
            <Path
              d={arcPath}
              fill="none"
              stroke={gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}

          {/* Center circle (white background for text) */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={36}
            fill={nbColors.bgCanvas}
          />

          {/* Score text */}
          <SvgText
            x={CENTER_X}
            y={CENTER_Y - 6}
            fontSize="32"
            fontWeight="700"
            fill={nbColors.gray900}
            textAnchor="middle"
          >
            {Math.round(normalizedScore)}
          </SvgText>

          {/* Grade text */}
          <SvgText
            x={CENTER_X}
            y={CENTER_Y + 18}
            fontSize="14"
            fontWeight="600"
            fill={gradeColor}
            textAnchor="middle"
          >
            Grade {grade}
          </SvgText>
        </Svg>
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <NBText variant="body-sm" color="gray700">
            {GRADE_LABELS[grade]}
          </NBText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: nbSpacing.sm,
  },
});
