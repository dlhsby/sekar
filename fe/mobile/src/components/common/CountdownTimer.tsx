/**
 * CountdownTimer Component
 * Countdown timer with HH:MM:SS format, updates every 1s
 * Neo Brutalism 2.0 compliant with WCAG 2.1 AA accessibility
 */

import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import {
  nbColors,
  nbType,
} from '../../constants/nbTokens';

type TimerColor = 'yellow' | 'green' | 'red';

interface CountdownTimerProps {
  startTime: string; // ISO timestamp
  color?: TimerColor;
  fontSize?: number;
  accessibilityLabel?: string;
}

const colorMap: Record<TimerColor, string> = {
  yellow: nbColors.warning,
  green: nbColors.primary,
  red: nbColors.danger,
};

export function CountdownTimer({
  startTime,
  color = 'yellow',
  fontSize = 40,
  accessibilityLabel,
}: CountdownTimerProps): JSX.Element {
  const [timer, setTimer] = useState('00:00:00');

  useEffect(() => {
    const pad = (num: number): string => String(num).padStart(2, '0');

    const updateTimer = () => {
      const elapsed = Date.now() - new Date(startTime).getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setTimer(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer(); // Initial update

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Text
      style={[
        styles.timer,
        {
          color: colorMap[color],
          fontSize,
        },
      ]}
      accessibilityLabel={accessibilityLabel || `Waktu berjalan: ${timer}`}
      accessibilityRole="timer"
    >
      {timer}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontWeight: nbType.displayXl.fontWeight,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
