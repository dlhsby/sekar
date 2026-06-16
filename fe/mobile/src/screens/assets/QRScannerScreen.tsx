/**
 * QR Scanner Screen
 * Phase 5-3: Manual QR code entry (camera scanning deferred to native build)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBBackgroundPattern,
  NBButton,
  NBPageHeader,
  NBText,
  NBTextInput,
  NBAlert,
} from '../../components/nb';
import { scanAsset, selectAssetsError } from '../../store/slices/assetsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing, nbRadius } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'QRScanner'>;
  route: RouteProp<MainTabParamList, 'QRScanner'>;
};

export function QRScannerScreen({ navigation }: Props): React.JSX.Element {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectAssetsError);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleScan = useCallback(async () => {
    if (!code.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await dispatch(scanAsset(code.trim()));

      if (result.payload && typeof result.payload === 'object' && 'id' in result.payload) {
        // Navigate to checkout screen with the scanned asset
        navigation.navigate('AssetCheckout', {
          assetId: (result.payload as any).id,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [code, dispatch, navigation]);

  const canSubmit = code.trim().length > 0 && !submitting;

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NBPageHeader title="Scan QR Code" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            {/* Scanner Frame Placeholder */}
            <View style={styles.scannerFramePlaceholder}>
              <MaterialCommunityIcons
                name="qrcode"
                size={80}
                color={nbColors.gray600}
              />
              <NBText variant="body-sm" style={styles.placeholderText}>
                Arahkan kamera ke QR code aset
              </NBText>
              <NBText variant="caption" style={styles.deferred}>
                * Live camera scanning tersedia di build native
              </NBText>
            </View>

            {/* Error Alert */}
            {error && (
              <NBAlert
                variant="danger"
                title="Pemindaian Gagal"
                message={error}
              />
            )}

            {/* Manual Code Entry */}
            <View style={styles.inputSection}>
              <NBText variant="body" style={styles.inputLabel}>
                Ketik Kode Manual
              </NBText>
              <NBTextInput
                placeholder="SEKAR:AK-RU-001 atau AK-RU-001"
                value={code}
                onChangeText={setCode}
                editable={!submitting}
              />
              <NBText variant="caption" style={styles.hint}>
                Format: SEKAR:CODE atau langsung masukkan CODE
              </NBText>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttons}>
              <NBButton
                label="Pindai"
                onPress={handleScan}
                variant="primary"
                disabled={!canSubmit}
                loading={submitting}
              />
              <NBButton
                label="Batal"
                onPress={() => navigation.goBack()}
                variant="secondary"
                disabled={submitting}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    gap: nbSpacing.lg,
    justifyContent: 'center',
  },
  scannerFramePlaceholder: {
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: nbColors.gray200,
    borderRadius: nbRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.bgSurface,
    gap: nbSpacing.md,
    padding: nbSpacing.md,
  },
  placeholderText: {
    color: nbColors.gray500,
    textAlign: 'center',
  },
  deferred: {
    color: nbColors.warning,
    textAlign: 'center',
    marginTop: nbSpacing.md,
    fontStyle: 'italic',
  },
  inputSection: {
    gap: nbSpacing.sm,
  },
  inputLabel: {
    fontWeight: '600',
  },
  hint: {
    color: nbColors.gray500,
    marginTop: nbSpacing.xs,
  },
  buttons: {
    gap: nbSpacing.md,
  },
});
