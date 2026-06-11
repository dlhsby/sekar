/**
 * StatusCard — displays status, reference code, submission metadata
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBText } from '../../../components/nb';
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
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.xs,
  },
  valueMono: {
    color: nbColors.black,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
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
  const handleCopyRef = useCallback(async () => {
    if (!request.referenceCode) return;
    try {
      const Clipboard = (await import('@react-native-clipboard/clipboard')).default;
      Clipboard.setString(request.referenceCode);
      NBToast.show({
        level: 'success',
        title: 'Disalin',
        body: request.referenceCode,
      });
    } catch {
      // native module unavailable in tests
    }
  }, [request.referenceCode]);

  return (
    <NBCard>
      <NBCardHeader>
        <View style={styles.statusRow}>
          <NBText variant="h2" style={styles.sectionTitle}>
            📌 STATUS
          </NBText>
          <NBBadge text={statusLabel} color={statusColor} />
        </View>
      </NBCardHeader>
      <NBCardContent>
        <View style={styles.infoRow}>
          <NBText variant="body-sm" style={styles.label}>
            Kode Permohonan
          </NBText>
          <View style={styles.refCodeRow}>
            <NBText variant="body" style={[styles.valueMono, styles.refCodeText]} selectable>
              {request.referenceCode || '—'}
            </NBText>
            {request.referenceCode ? (
              <TouchableOpacity
                onPress={handleCopyRef}
                accessibilityRole="button"
                accessibilityLabel="Salin kode permohonan"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.copyBtn}
                testID="perantingan-copy-ref"
              >
                <MaterialCommunityIcons name="content-copy" size={18} color={nbColors.black} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {request.submitter?.full_name || request.submitter?.username || request.requesterName ? (
          <View style={styles.infoRow}>
            <NBText variant="body-sm" style={styles.label}>
              Diajukan Oleh
            </NBText>
            <NBText variant="body">
              {request.submitter?.full_name ||
                request.submitter?.username ||
                request.requesterName}
            </NBText>
          </View>
        ) : null}
        <View style={[styles.infoRow, { marginBottom: 0 }]}>
          <NBText variant="body-sm" style={styles.label}>
            Diajukan Pada
          </NBText>
          <NBText variant="body">{formatDateTime(request.createdAt)}</NBText>
        </View>
      </NBCardContent>
    </NBCard>
  );
}
