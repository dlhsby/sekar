/**
 * SubmitContactCard — Requester and RT leader contact info.
 */

import React from 'react';
import { View } from 'react-native';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBTextInput,
  NBText,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
} from '../../../constants/nbTokens';

interface SubmitContactCardProps {
  requesterName: string;
  setRequesterName: (v: string) => void;
  requesterPhone: string;
  setRequesterPhone: (v: string) => void;
  rtLeaderName: string;
  setRtLeaderName: (v: string) => void;
  rtLeaderPhone: string;
  setRtLeaderPhone: (v: string) => void;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

const styles = {
  card: { marginBottom: nbSpacing[4] },
  fieldGroup: { marginBottom: nbSpacing[3] },
  subHeading: {
    color: nbColors.black,
    fontWeight: '600' as const,
    marginTop: nbSpacing[2],
    marginBottom: nbSpacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: nbColors.gray300,
    marginVertical: nbSpacing[3],
  },
  helper: {
    color: nbColors.gray600,
    marginTop: nbSpacing[1],
  },
};

export function SubmitContactCard(props: SubmitContactCardProps) {
  const {
    requesterName,
    setRequesterName,
    requesterPhone,
    setRequesterPhone,
    rtLeaderName,
    setRtLeaderName,
    rtLeaderPhone,
    setRtLeaderPhone,
  } = props;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <NBText variant="h3">Kontak</NBText>
        <NBText variant="body-sm" style={styles.helper}>
          Pemohon dan ketua RT setempat (untuk verifikasi lapangan).
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body-sm" style={styles.subHeading}>Pemohon</NBText>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Nama Pemohon *"
            placeholder="Nama lengkap"
            value={requesterName}
            onChangeText={setRequesterName}
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Nomor HP Pemohon *"
            placeholder="08xxxxxxxxxx"
            value={requesterPhone}
            onChangeText={(v) => setRequesterPhone(digitsOnly(v))}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.divider} />

        <NBText variant="body-sm" style={styles.subHeading}>Ketua RT/RW</NBText>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Nama Ketua RT/RW *"
            placeholder="Nama lengkap"
            value={rtLeaderName}
            onChangeText={setRtLeaderName}
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Nomor HP Ketua RT/RW *"
            placeholder="08xxxxxxxxxx"
            value={rtLeaderPhone}
            onChangeText={(v) => setRtLeaderPhone(digitsOnly(v))}
            keyboardType="phone-pad"
          />
        </View>
      </NBCardContent>
    </NBCard>
  );
}
