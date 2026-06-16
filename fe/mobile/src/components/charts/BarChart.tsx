/**
 * Bar Chart Component
 * Simple 7-day bar chart using react-native-svg
 * Used for attendance and task completion trends
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { NBText } from '../nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

interface BarChartProps {
  data: number[];
  label?: string;
  maxValue?: number;
  height?: number;
  barColor?: string;
  showLabels?: boolean;
}

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const DEFAULT_HEIGHT = 180;
const PADDING = 16;
const BOTTOM_LABEL_HEIGHT = 20;
const TOP_MARGIN = 12;

export function BarChart({
  data,
  label,
  maxValue: customMaxValue,
  height = DEFAULT_HEIGHT,
  barColor = nbColors.primary,
  showLabels = true,
}: BarChartProps): React.JSX.Element {
  // Normalize data: ensure it's 7 items, pad with 0 if needed
  const normalizedData = useMemo(() => {
    const normalized = [...data];
    while (normalized.length < 7) {
      normalized.push(0);
    }
    return normalized.slice(0, 7);
  }, [data]);

  // Calculate max value for scale
  const maxValue = useMemo(() => {
    if (customMaxValue !== undefined) return Math.max(customMaxValue, 1);
    const max = Math.max(...normalizedData, 1);
    // Round up to nearest 10
    return Math.ceil(max / 10) * 10;
  }, [normalizedData, customMaxValue]);

  // Chart dimensions
  const chartHeight = height - PADDING * 2 - (showLabels ? BOTTOM_LABEL_HEIGHT : 0) - TOP_MARGIN;
  const chartWidth = 280;
  const barWidth = (chartWidth - PADDING * 2) / 7;
  const barSpacing = barWidth * 0.15;
  const actualBarWidth = barWidth - barSpacing;

  // Empty state
  if (normalizedData.every((v) => v === 0)) {
    return (
      <View style={styles.container}>
        {label && <NBText variant="body-sm" style={styles.label}>{label}</NBText>}
        <View style={[styles.emptyState, { height }]}>
          <NBText variant="body-sm" color="gray500">
            Tidak ada data
          </NBText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <NBText variant="body-sm" style={styles.label}>{label}</NBText>}
      <Svg
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        style={styles.chart}
      >
        {/* Background grid lines (every 25% of max) */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = height - PADDING - (showLabels ? BOTTOM_LABEL_HEIGHT : 0) - chartHeight * pct;
          return (
            <Line
              key={`gridline-${idx}`}
              x1={PADDING}
              y1={y}
              x2={chartWidth - PADDING}
              y2={y}
              stroke={nbColors.gray200}
              strokeWidth="1"
            />
          );
        })}

        {/* Y-axis labels (max value markers) */}
        {[0, 0.5, 1].map((pct, idx) => {
          const value = Math.round(maxValue * pct);
          const y =
            height - PADDING - (showLabels ? BOTTOM_LABEL_HEIGHT : 0) - chartHeight * pct + 4;
          return (
            <SvgText
              key={`ylabel-${idx}`}
              x={PADDING - 4}
              y={y}
              fontSize="10"
              fill={nbColors.gray600}
              textAnchor="end"
            >
              {value}
            </SvgText>
          );
        })}

        {/* Bars */}
        {normalizedData.map((value, idx) => {
          const barHeight = (value / maxValue) * chartHeight;
          const x = PADDING + idx * barWidth + barSpacing / 2;
          const y = height - PADDING - (showLabels ? BOTTOM_LABEL_HEIGHT : 0) - barHeight;

          return (
            <Rect
              key={`bar-${idx}`}
              x={x}
              y={y}
              width={actualBarWidth}
              height={Math.max(barHeight, 2)} // Minimum 2px for visibility
              fill={barColor}
              rx="2"
            />
          );
        })}

        {/* X-axis labels (day abbreviations) */}
        {showLabels &&
          normalizedData.map((_, idx) => {
            const x =
              PADDING + idx * barWidth + barWidth / 2;
            const y =
              height - PADDING + BOTTOM_LABEL_HEIGHT / 2 + 4;
            return (
              <SvgText
                key={`xlabel-${idx}`}
                x={x}
                y={y}
                fontSize="11"
                fill={nbColors.gray600}
                textAnchor="middle"
              >
                {DAYS[idx]}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  label: {
    marginBottom: nbSpacing.sm,
    color: nbColors.gray700,
  },
  chart: {
    alignSelf: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 280,
  },
});
