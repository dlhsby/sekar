/**
 * OvertimeSelfieSection
 * Reusable selfie capture section (used in both State A and B).
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import {
  NBCollapsibleCard,
  NBText,
  NBButton,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../../constants/nbTokens';
import type { Photo } from '../../../services/media';

interface OvertimeSelfieProps {
  label: string;
  selfie: Photo | null;
  onCapture: () => void;
  onPreview: (uri: string) => void;
  retakeButtonLabel?: string;
  captureButtonLabel?: string;
}

const OvertimeSelfieSection: React.FC<OvertimeSelfieProps> = ({
  label,
  selfie,
  onCapture,
  onPreview,
  retakeButtonLabel = 'Ambil Ulang',
  captureButtonLabel = 'Ambil Selfie',
}) => (
  <NBCollapsibleCard
    style={styles.selfieCard}
    accessibilityLabel={label}
    headerLeft={
      <View>
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>
          {label}
        </NBText>
        {selfie ? (
          <NBText variant="body-sm" color="success">Sudah diambil ✓</NBText>
        ) : (
          <NBText variant="body-sm" color="gray600">Opsional</NBText>
        )}
      </View>
    }
  >
    {selfie ? (
      <View>
        <TouchableOpacity
          onPress={() => onPreview(selfie.uri)}
          accessibilityRole="button"
          accessibilityLabel="Lihat selfie penuh"
          accessibilityHint="Ketuk untuk melihat foto dalam ukuran penuh"
        >
          <Image source={{ uri: selfie.uri }} style={styles.selfieImage} />
        </TouchableOpacity>
        <NBButton
          title={retakeButtonLabel}
          onPress={onCapture}
          variant="secondary"
          fullWidth
        />
      </View>
    ) : (
      <View>
        <NBText variant="body-sm" color="gray600" style={styles.selfiePrompt}>
          Foto selfie untuk verifikasi (tidak wajib)
        </NBText>
        <NBButton
          title={captureButtonLabel}
          onPress={onCapture}
          variant="secondary"
          fullWidth
        />
      </View>
    )}
  </NBCollapsibleCard>
);

const styles = StyleSheet.create({
  selfieCard: {
    marginHorizontal: 0,
  },
  selfieImage: {
    width: '100%',
    height: 200,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.gray200,
  },
  selfiePrompt: {
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
});

export default OvertimeSelfieSection;
