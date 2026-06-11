/**
 * ContactRow — contact information display with copy/WhatsApp/call actions
 * Reusable component for pemohon, ketua RT/RW contact rows.
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { NBToast } from '../../../components/nb/NBToast';
import { normalizePhone } from '../hooks/usePhoneNormalization';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';
import { StyleSheet } from 'react-native';

interface ContactRowProps {
  label: string;
  name?: string | null;
  phone?: string | null;
  isLast?: boolean;
}

const styles = StyleSheet.create({
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.xs,
  },
  value: {
    color: nbColors.black,
  },
  contactPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.xs,
  },
  contactPhoneText: {
    flexShrink: 1,
    color: nbColors.black,
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  contactIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.white,
  },
});

export function ContactRow({
  label,
  name,
  phone,
  isLast,
}: ContactRowProps): React.JSX.Element {
  const normalized = normalizePhone(phone);

  const handleCopy = useCallback(async () => {
    if (!phone) return;
    try {
      const Clipboard = (await import('@react-native-clipboard/clipboard')).default;
      Clipboard.setString(phone);
      NBToast.show({ level: 'success', title: 'Disalin', body: phone });
    } catch {
      // native module unavailable in tests
    }
  }, [phone]);

  const handleWhatsApp = useCallback(() => {
    if (!normalized) return;
    void Linking.openURL(`https://wa.me/${normalized}`);
  }, [normalized]);

  const handleCall = useCallback(() => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`);
  }, [phone]);

  return (
    <View style={[styles.infoRow, isLast && { marginBottom: 0 }]}>
      <NBText variant="body-sm" style={styles.label}>
        {label}
      </NBText>
      <NBText variant="body" style={styles.value}>
        {name || '—'}
      </NBText>
      {phone ? (
        <View style={styles.contactPhoneRow}>
          <NBText variant="body" style={styles.contactPhoneText} selectable>
            {phone}
          </NBText>
          <View style={styles.contactActions}>
            <TouchableOpacity
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={`Salin nomor ${label}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.contactIconBtn}
              testID={`perantingan-contact-copy-${label}`}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={nbColors.black} />
            </TouchableOpacity>
            {normalized ? (
              <TouchableOpacity
                onPress={handleWhatsApp}
                accessibilityRole="button"
                accessibilityLabel={`Chat WhatsApp ${label}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.contactIconBtn}
                testID={`perantingan-contact-wa-${label}`}
              >
                {/* eslint-disable-next-line sekar-design/no-inline-hex-colors -- WhatsApp brand color; no NB token equivalent */}
                <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handleCall}
              accessibilityRole="button"
              accessibilityLabel={`Telepon ${label}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.contactIconBtn}
              testID={`perantingan-contact-call-${label}`}
            >
              <MaterialCommunityIcons name="phone" size={18} color={nbColors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
