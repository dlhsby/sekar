/**
 * Permission Request Modal
 *
 * User-friendly modal to request app permissions after login.
 * Explains WHY each permission is needed and guides users through the process.
 *
 * Features:
 * - Step-by-step permission requests (Notifications → Location → Background Location)
 * - Clear explanations for each permission
 * - MIUI-specific guidance for background location
 * - Skip option for non-critical permissions
 * - Fallback to settings if permission is blocked
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
  nbShadows,
  nbRadius,
  nbTextStyles,
  withAlpha,
} from '../../constants/nbTokens';
import {
  permissionManager,
  PermissionResult,
  PermissionType,
} from '../../services/permissions/PermissionManager';
import { RESULTS } from 'react-native-permissions';
import { logger } from '../../utils/logger';

interface PermissionRequestModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * Permission step information
 */
interface PermissionStep {
  type: PermissionType;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  required: boolean;
  androidNote?: string; // Additional guidance for Android users
}

/**
 * Permission request steps (in order)
 */
const PERMISSION_STEPS: PermissionStep[] = [
  {
    type: PermissionType.NOTIFICATIONS,
    title: 'Notifikasi',
    description:
      'Terima pemberitahuan penting tentang tugas baru, pengingat shift, dan informasi dari supervisor.',
    icon: 'bell-outline',
    iconColor: nbColors.warningLight,
    required: true,
  },
  {
    type: PermissionType.LOCATION,
    title: 'Lokasi',
    description:
      'Diperlukan untuk absensi digital dan memverifikasi Anda berada di lokasi kerja yang benar saat clock-in.',
    icon: 'map-marker-outline',
    iconColor: nbColors.info,
    required: true,
  },
  {
    type: PermissionType.BACKGROUND_LOCATION,
    title: 'Lokasi Latar Belakang',
    description:
      'Izinkan "Sepanjang waktu" untuk melacak rute Anda selama shift kerja. Data ini membantu supervisor memantau area yang sudah dikerjakan.',
    icon: 'map-marker-path',
    iconColor: nbColors.primary,
    required: true,
    androidNote:
      'PENTING:\n1. Pilih "Izinkan sepanjang waktu" atau "Allow all the time"\n2. Jika opsi tidak muncul, buka Pengaturan → Aplikasi → SEKAR → Izin → Lokasi\n3. Pilih "Sepanjang waktu" atau "Allow all the time"',
  },
  {
    type: PermissionType.CAMERA,
    title: 'Kamera',
    description:
      'Diperlukan untuk mengambil foto laporan kerja. Foto membantu supervisor memverifikasi pekerjaan yang telah diselesaikan.',
    icon: 'camera-outline',
    iconColor: nbColors.secondary,
    required: true,
  },
  {
    type: PermissionType.GALLERY,
    title: 'Galeri Foto',
    description:
      'Diperlukan untuk memilih foto dari galeri saat melengkapi laporan atau permohonan perantingan.',
    icon: 'image-multiple-outline',
    iconColor: nbColors.info,
    required: true,
  },
];

/**
 * Permission Request Modal Component
 */
export function PermissionRequestModal({
  visible,
  onComplete,
  onSkip,
}: PermissionRequestModalProps): React.ReactElement {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showAndroidGuidance, setShowAndroidGuidance] = useState(false);
  // Per-step results are tracked via the setter (write-only — drives no UI).
  const [, setStepResults] = useState<PermissionResult[]>([]);

  // Safely get current step with bounds checking
  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), PERMISSION_STEPS.length - 1);
  const currentStep = PERMISSION_STEPS[safeStepIndex];
  const isLastStep = currentStepIndex === PERMISSION_STEPS.length - 1;
  const canSkip = !currentStep?.required;

  /**
   * Reset modal state
   */
  const resetModal = useCallback(() => {
    setCurrentStepIndex(0);
    setIsRequesting(false);
    setStepResults([]);
    setShowAndroidGuidance(false);
  }, []);

  /**
   * Check if device is Android 10+ (requires special background location handling)
   */
  const isAndroid10Plus = useCallback(() => {
    // Android 10 (API level 29) and above require separate background location permission
    return Platform.OS === 'android' && Platform.Version >= 29;
  }, []);

  /**
   * Request permission for current step
   */
  const handleRequestPermission = useCallback(async () => {
    /* istanbul ignore next */
    if (!currentStep) {
      return;
    }

    setIsRequesting(true);

    try {
      let result: PermissionResult;

      switch (currentStep.type) {
        case PermissionType.NOTIFICATIONS:
          result = await permissionManager.requestNotificationPermission();
          break;

        case PermissionType.LOCATION:
          result = await permissionManager.requestLocationPermission();
          break;

        case PermissionType.BACKGROUND_LOCATION:
          // Show guidance before requesting (for Android 10+)
          if (isAndroid10Plus() && !showAndroidGuidance) {
            setShowAndroidGuidance(true);
            setIsRequesting(false);
            return;
          }
          result = await permissionManager.requestBackgroundLocationPermission();
          break;

        case PermissionType.CAMERA:
          result = await permissionManager.requestCameraPermission();
          break;

        case PermissionType.GALLERY:
          result = await permissionManager.requestGalleryPermission();
          break;

        /* istanbul ignore next */
        default:
          result = {
            granted: false,
            status: RESULTS.UNAVAILABLE,
            canRequest: false,
            message: 'Unknown permission type',
          };
      }


      // If permission granted or blocked, move to next step
      if (result.granted || result.status === RESULTS.BLOCKED) {
        if (isLastStep) {
          // All steps completed
          await permissionManager.setOnboardingCompleted();
          onComplete();
          resetModal();
        } else {
          // Move to next step
          setCurrentStepIndex(prev => prev + 1);
          setShowAndroidGuidance(false);
        }
      } else if (!result.canRequest) {
        // Permission blocked - offer to open settings
        // For now, just move to next step (user can enable later)
        if (isLastStep) {
          await permissionManager.setOnboardingCompleted();
          onComplete();
          resetModal();
        } else {
          setCurrentStepIndex(prev => prev + 1);
          setShowAndroidGuidance(false);
        }
      }
    } catch (error) {
      logger.error('[PermissionRequestModal] Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  }, [currentStep, isLastStep, onComplete, resetModal, isAndroid10Plus, showAndroidGuidance]);

  /**
   * Handle skip current step
   */
  /* istanbul ignore next */
  const handleSkip = useCallback(() => {
    if (isLastStep) {
      // Mark as completed even if skipped
      permissionManager.setOnboardingCompleted();
      if (onSkip) {
        onSkip();
      } else {
        onComplete();
      }
      resetModal();
    } else {
      // Move to next step
      setCurrentStepIndex(prev => prev + 1);
      setShowAndroidGuidance(false);
    }
  }, [isLastStep, onComplete, onSkip, resetModal]);

  /**
   * Handle open settings
   */
  const handleOpenSettings = useCallback(async () => {
    await permissionManager.openSettings();
  }, []);

  /**
   * Render permission step card
   */
  const renderStepCard = () => {
    /* istanbul ignore next */
    if (!currentStep || !currentStep.title || !currentStep.description) {
      logger.warn('[PermissionRequestModal] Invalid current step:', currentStepIndex, currentStep);
      return null;
    }

    const title = String(currentStep.title || 'Izin');
    const description = String(currentStep.description || '');
    const iconColor = currentStep.iconColor || nbColors.primary;
    const icon = currentStep.icon || 'help-circle';

    return (
      <View style={styles.stepCard} key={`card-${currentStepIndex}`}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(iconColor, 0.2) }]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={48}
            color={iconColor}
          />
        </View>

        {/* Title */}
        <Text style={styles.stepTitle}>{title}</Text>

        {/* Description */}
        <Text style={styles.stepDescription}>{description}</Text>

        {/* Android Guidance (if applicable) */}
        {showAndroidGuidance &&
         currentStep?.type === PermissionType.BACKGROUND_LOCATION &&
         currentStep?.androidNote &&
         typeof currentStep.androidNote === 'string' && (
          <View style={styles.androidNote}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={nbColors.info}
              style={styles.androidNoteIcon}
            />
            <Text style={styles.androidNoteText}>
              {currentStep.androidNote}
            </Text>
          </View>
        )}

        {/* Required badge */}
        {currentStep?.required && (
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Wajib</Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render progress indicator
   */
  const renderProgress = () => {
    return (
      <View style={styles.progressContainer}>
        {PERMISSION_STEPS.map((step, index) => (
          <View
            key={step.type}
            style={[
              styles.progressDot,
              index === currentStepIndex && styles.progressDotActive,
              index < currentStepIndex && styles.progressDotCompleted,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        // Prevent closing by back button - require completion
      }}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={32}
            color={nbColors.primary}
          />
          <Text style={styles.headerTitle}>Izin Aplikasi</Text>
          <Text style={styles.headerSubtitle}>
            Langkah {currentStepIndex + 1} dari {PERMISSION_STEPS.length}
          </Text>
        </View>

        {/* Progress */}
        {renderProgress()}

        {/* Content */}
        <ScrollView
          key={`step-${currentStepIndex}`}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderStepCard()}

          {/* Info box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={nbColors.info}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Kami memerlukan izin ini untuk memberikan pengalaman terbaik saat menggunakan
              aplikasi SEKAR.
            </Text>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <NBButton
            title={showAndroidGuidance ? 'Mengerti, Lanjutkan' : 'Izinkan'}
            onPress={handleRequestPermission}
            loading={isRequesting}
            disabled={isRequesting}
            fullWidth
            variant="primary"
          />

          {canSkip && (
            <NBButton
              title="Lewati"
              onPress={handleSkip}
              disabled={isRequesting}
              fullWidth
              variant="ghost"
              style={styles.skipButton}
            />
          )}

          <Pressable
            onPress={handleOpenSettings}
            disabled={isRequesting}
            style={styles.settingsLink}
          >
            <Text style={styles.settingsLinkText}>Buka Pengaturan</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  header: {
    alignItems: 'center',
    paddingTop: nbSpacing.xl,
    paddingHorizontal: nbSpacing.lg,
    paddingBottom: nbSpacing.md,
    backgroundColor: nbColors.bgSurface,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbBorders.color,
  },
  headerTitle: {
    ...nbTextStyles.h2,
    marginTop: nbSpacing.sm,
    color: nbColors.black,
  },
  headerSubtitle: {
    ...nbTextStyles.bodySmall,
    marginTop: nbSpacing.xs,
    color: nbColors.gray600,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.lg,
    gap: nbSpacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: nbRadius.full,
    backgroundColor: nbColors.gray300,
    borderWidth: nbBorders.widthThin,
    borderColor: nbBorders.color,
  },
  progressDotActive: {
    backgroundColor: nbColors.primary,
    width: 16,
    height: 16,
  },
  progressDotCompleted: {
    backgroundColor: nbColors.success,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: nbSpacing.lg,
  },
  stepCard: {
    backgroundColor: nbColors.bgSurface,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbBorders.color,
    padding: nbSpacing.lg,
    alignItems: 'center',
    ...nbShadows.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbBorders.color,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nbSpacing.md,
  },
  stepTitle: {
    ...nbTextStyles.h2,
    marginBottom: nbSpacing.sm,
    color: nbColors.black,
    textAlign: 'center',
  },
  stepDescription: {
    ...nbTextStyles.body,
    color: nbColors.gray700,
    textAlign: 'center',
    lineHeight: nbType.body.lineHeight,
  },
  androidNote: {
    flexDirection: 'row',
    backgroundColor: withAlpha(nbColors.info, 0.1),
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.info,
    padding: nbSpacing.md,
    marginTop: nbSpacing.md,
  },
  androidNoteIcon: {
    marginRight: nbSpacing.sm,
    marginTop: 2,
  },
  androidNoteText: {
    ...nbTextStyles.bodySmall,
    color: nbColors.gray700,
    flex: 1,
    lineHeight: nbType.bodySm.lineHeight,
  },
  requiredBadge: {
    backgroundColor: nbColors.danger,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbBorders.color,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    marginTop: nbSpacing.md,
  },
  requiredBadgeText: {
    ...nbTextStyles.caption,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: withAlpha(nbColors.info, 0.1),
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.info,
    padding: nbSpacing.md,
    marginTop: nbSpacing.lg,
  },
  infoIcon: {
    marginRight: nbSpacing.sm,
    marginTop: 2,
  },
  infoText: {
    ...nbTextStyles.bodySmall,
    color: nbColors.gray700,
    flex: 1,
    lineHeight: nbType.bodySm.lineHeight,
  },
  actions: {
    padding: nbSpacing.lg,
    backgroundColor: nbColors.bgSurface,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbBorders.color,
  },
  skipButton: {
    marginTop: nbSpacing.md,
  },
  settingsLink: {
    marginTop: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    alignItems: 'center',
  },
  settingsLinkText: {
    ...nbTextStyles.body,
    color: nbColors.primary,
    textDecorationLine: 'underline',
  },
});
