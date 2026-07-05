/**
 * SubmitContactCard — Requester and RT leader contact info.
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pruning');
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
        <NBText variant="h3">{t('submit.contactCardTitle')}</NBText>
        <NBText variant="body-sm" style={styles.helper}>
          {t('submit.contactHelper')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body-sm" style={styles.subHeading}>{t('submit.requesterLabel')}</NBText>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submit.requesterNameLabel')}
            placeholder={t('submit.requesterNamePlaceholder')}
            value={requesterName}
            onChangeText={setRequesterName}
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submit.requesterPhoneLabel')}
            placeholder={t('submit.requesterPhonePlaceholder')}
            value={requesterPhone}
            onChangeText={(v) => setRequesterPhone(digitsOnly(v))}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.divider} />

        <NBText variant="body-sm" style={styles.subHeading}>{t('submit.rtRwLeaderLabel')}</NBText>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submit.rtRwLeaderNameLabel')}
            placeholder={t('submit.rtRwLeaderNamePlaceholder')}
            value={rtLeaderName}
            onChangeText={setRtLeaderName}
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submit.rtRwLeaderPhoneLabel')}
            placeholder={t('submit.rtRwLeaderPhonePlaceholder')}
            value={rtLeaderPhone}
            onChangeText={(v) => setRtLeaderPhone(digitsOnly(v))}
            keyboardType="phone-pad"
          />
        </View>
      </NBCardContent>
    </NBCard>
  );
}
