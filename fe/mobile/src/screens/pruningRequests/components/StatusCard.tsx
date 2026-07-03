/**
 * StatusCard — displays status, reference code, submission metadata
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBText } from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import { NBToast } from '../../../components/nb/NBToast';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import type { PruningRequest } from '../../../types/models.types';

interface StatusCardProps {
  request: PruningRequest;
  statusLabel: string;
  statusColor: 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'navy';
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  refCodeText: {
    flexShrink: 1,
  },
  copyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function StatusCard({
  request,
  statusLabel,
  statusColor,
}: StatusCardProps): React.JSX.Element {
  const { t } = useTranslation('pruning');
  const handleCopyRef = useCallback(async () => {
    if (!request.referenceCode) return;
    try {
      const Clipboard = (await import('@react-native-clipboard/clipboard')).default;
      Clipboard.setString(request.referenceCode);
      NBToast.show({
        level: 'success',
        title: t('statusCard.copiedToast'),
        body: request.referenceCode,
      });
    } catch {
      // native module unavailable in tests
    }
  }, [request.referenceCode, t]);

  return (
    <NBCard>
      <NBCardHeader>
        <View style={styles.statusRow}>
          <NBText variant="h2" style={styles.sectionTitle}>
            {t('statusCard.sectionTitle')}
          </NBText>
          <NBBadge text={statusLabel} color={statusColor} />
        </View>
      </NBCardHeader>
      <NBCardContent>
        <DetailRow
          label={t('statusCard.referenceCodeLabel')}
          value={
            <View style={styles.refCodeRow}>
              <NBText variant="body" style={styles.refCodeText} selectable>
                {request.referenceCode || '—'}
              </NBText>
              {request.referenceCode ? (
                <TouchableOpacity
                  onPress={handleCopyRef}
                  accessibilityRole="button"
                  accessibilityLabel={t('statusCard.copyButtonLabel')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.copyBtn}
                  testID="perantingan-copy-ref"
                >
                  <MaterialCommunityIcons name="content-copy" size={18} color={nbColors.black} />
                </TouchableOpacity>
              ) : null}
            </View>
          }
          variant="mono"
        />
        {request.submitter?.full_name || request.submitter?.username || request.requesterName ? (
          <DetailRow
            label={t('statusCard.submittedByLabel')}
            value={
              request.submitter?.full_name ||
              request.submitter?.username ||
              request.requesterName ||
              '—'
            }
          />
        ) : null}
        <DetailRow
          label={t('statusCard.submittedAtLabel')}
          value={formatDateTime(request.createdAt)}
          isLast={!request.submitter?.full_name && !request.submitter?.username && !request.requesterName}
        />
      </NBCardContent>
    </NBCard>
  );
}
