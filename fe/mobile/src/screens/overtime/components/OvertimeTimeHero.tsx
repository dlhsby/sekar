/**
 * OvertimeTimeHero
 * Time/date display hero component for State A (Mulai Lembur).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  NBCollapsibleCard,
  NBText,
} from '../../../components/nb';

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTimeHero(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateHero(d: Date): string {
  return `${DAY_NAMES_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]}`;
}

interface OvertimeTimeHeroProps {
  currentTime: Date;
}

const OvertimeTimeHero: React.FC<OvertimeTimeHeroProps> = ({ currentTime }) => (
  <NBCollapsibleCard
    style={styles.selfieCard}
    headerLeft={
      <NBText variant="h2" color="black" style={styles.timeHeroTime}>
        {formatTimeHero(currentTime)}
      </NBText>
    }
    headerRight={
      <NBText variant="mono-sm" color="gray600">
        {formatDateHero(currentTime)}
      </NBText>
    }
    accessibilityLabel="Detail waktu"
  >
    <NBText variant="body-sm" color="gray600" style={styles.centerText}>
      Konfirmasi lokasi GPS untuk memulai lembur
    </NBText>
  </NBCollapsibleCard>
);

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
