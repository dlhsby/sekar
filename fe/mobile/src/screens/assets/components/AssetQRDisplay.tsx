/**
 * Asset QR Display Component
 * Shows QR code image or placeholder
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';

interface AssetQRDisplayProps {
  qrCodeUrl?: string | null;
  assetCode: string;
}

export function AssetQRDisplay({
  qrCodeUrl,
  assetCode,
}: AssetQRDisplayProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {qrCodeUrl ? (
        <Image
          source={{ uri: qrCodeUrl }}
          style={styles.qrImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="qrcode"
            size={40}
            color={nbColors.gray500}
          />
          <NBText variant="body-sm" style={styles.placeholderText}>
            QR tidak tersedia
          </NBText>
        </View>
      )}
      <NBText variant="caption" style={styles.code}>
        {assetCode}
      </NBText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: nbSpacing.sm,
    padding: nbSpacing.md,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray200,
    borderRadius: nbRadius.md,
    backgroundColor: nbColors.bgCanvas,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  placeholder: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.bgSurface,
    borderRadius: nbRadius.md,
    gap: nbSpacing.sm,
  },
  placeholderText: {
    color: nbColors.gray500,
  },
  code: {
    color: nbColors.gray600,
    fontFamily: 'JetBrainsMono-Medium',
  },
});
