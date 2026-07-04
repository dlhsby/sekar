/**
 * OvertimeTimeHero
 * Time/date display hero component for State A (Mulai Lembur).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  NBCollapsibleCard,
  NBText,
} from '../../../components/nb';

function formatTimeHero(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateHero(d: Date, dayNames: string[], monthNames: string[]): string {
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
}

interface OvertimeTimeHeroProps {
  currentTime: Date;
}

const OvertimeTimeHero: React.FC<OvertimeTimeHeroProps> = ({ currentTime }) => {
  const { t } = useTranslation();
  const dayNames = t('overtime:dayNames', { returnObjects: true }) as string[];
  const monthNames = t('common:calendar.monthsShort', { returnObjects: true }) as string[];

  return (
    <NBCollapsibleCard
      style={styles.selfieCard}
      headerLeft={
        <NBText variant="h2" color="black" style={styles.timeHeroTime}>
          {formatTimeHero(currentTime)}
        </NBText>
      }
      headerRight={
        <NBText variant="mono-sm" color="gray600">
          {formatDateHero(currentTime, dayNames, monthNames)}
        </NBText>
      }
      accessibilityLabel={t('components:ui.timeDetails')}
    >
      <NBText variant="body-sm" color="gray600" style={styles.centerText}>
        {t('overtime:confirmGPSToStart')}
      </NBText>
    </NBCollapsibleCard>
  );
};

const styles = StyleSheet.create({
  selfieCard: {
    marginHorizontal: 0,
  },
  timeHeroTime: {
    letterSpacing: 0.5,
  },
  centerText: {
    textAlign: 'center',
  },
});

export default OvertimeTimeHero;
