/**
 * SubmitWeekCard — Preferred week picker (Minggu Preferensi).
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBText,
} from '../../../components/nb';
import { WeekPickerModal } from './WeekPickerModal';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../../constants/nbTokens';
import type { PickedWeek } from './WeekPicker';

interface RawCapacityRow {
  week: number;
  year: number;
  [key: string]: any;
}

interface SubmitWeekCardProps {
  expectedWeek: PickedWeek | null;
  setExpectedWeek: (w: PickedWeek | null) => void;
  weekPickerOpen: boolean;
  setWeekPickerOpen: (v: boolean) => void;
  capacityRows: RawCapacityRow[];
  capacityLoading: boolean;
}

const styles = {
  card: { marginBottom: nbSpacing[4] },
  dateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: nbSpacing[3],
    paddingHorizontal: nbSpacing[3],
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    gap: nbSpacing[2],
  },
  helper: {
    color: nbColors.gray600,
    marginTop: nbSpacing[1],
  },
  legend: {
    marginTop: nbSpacing[2],
  },
};

export function SubmitWeekCard(props: SubmitWeekCardProps) {
  const {
    expectedWeek,
    setExpectedWeek,
    weekPickerOpen,
    setWeekPickerOpen,
    capacityRows,
    capacityLoading,
  } = props;

  return (
    <>
      <NBCard style={styles.card}>
        <NBCardHeader>
          <NBText variant="h3">Minggu Preferensi (Opsional)</NBText>
          <NBText variant="body-sm" style={styles.helper}>
            Pilih minggu yang Anda inginkan. Admin Rayon akan menentukan tanggal pasti sesuai kapasitas tim. Indikator hari pada setiap kartu hanya gambaran ketersediaan minggu tersebut.
          </NBText>
        </NBCardHeader>
        <NBCardContent>
          <TouchableOpacity
            onPress={() => setWeekPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Pilih minggu preferensi"
            style={styles.dateRow}
            testID="perantingan-pick-week"
          >
            <View style={{ flex: 1 }}>
              <NBText variant="caption" style={styles.helper}>Minggu</NBText>
              <NBText variant="body">
                {expectedWeek
                  ? `Minggu ke-${expectedWeek.isoWeek}, ${expectedWeek.year}`
                  : 'Pilih minggu…'}
              </NBText>
            </View>
            <MaterialCommunityIcons name="calendar-week" size={22} color={nbColors.black} />
          </TouchableOpacity>
          <NBText
            variant="body-sm"
            style={[styles.legend] as any}
          >
            🟢 tersedia · 🟡 hampir penuh · 🔴 penuh · ⚪ belum diatur
          </NBText>
        </NBCardContent>
      </NBCard>

      <WeekPickerModal
        visible={weekPickerOpen}
        onClose={() => setWeekPickerOpen(false)}
        rows={capacityRows}
        selected={expectedWeek}
        onSelect={(w) => setExpectedWeek(w)}
        loading={capacityLoading}
      />
    </>
  );
}
