/**
 * Edit Profile Screen
 * Phase 2E: Allows users to update their profile picture
 * Displays current profile info (read-only) and photo upload controls
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern } from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser } from '../../store/slices/authSlice';
import { uploadProfilePicture } from '../../services/api/usersApi';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import type { MainTabScreenProps } from '../../types/navigation.types';

// ─── Role label mapping ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  satgas: 'Satgas RTH',
  linmas: 'Linmas',
  korlap: 'Koordinator Lapangan',
  admin_data: 'Admin Data',
  kepala_rayon: 'Kepala Rayon',
  top_management: 'Top Management',
  admin_system: 'Admin Sistem',
  superadmin: 'Superadmin',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function EditProfileScreen(): React.JSX.Element {
  const navigation =
    useNavigation<MainTabScreenProps<'EditProfile'>['navigation']>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // ─── Image picker ─────────────────────────────────────────────────────────

  const pickFromCamera = useCallback(async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        saveToPhotos: false,
        presentationStyle: 'fullScreen',
      });
      if (result.didCancel) { return; }
      if (result.errorCode) {
        Alert.alert('Error', 'Gagal membuka kamera. Periksa izin akses.');
        return;
      }
      if (result.assets?.[0]?.uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Gagal membuka kamera.');
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        selectionLimit: 1,
        presentationStyle: 'fullScreen',
      });
      if (result.didCancel) { return; }
      if (result.errorCode) {
        Alert.alert('Error', 'Gagal membuka galeri. Periksa izin akses.');
        return;
      }
      if (result.assets?.[0]?.uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Gagal membuka galeri.');
    }
  }, []);

  const handlePickImage = useCallback(() => {
    Alert.alert(
      'Ganti Foto Profil',
      'Pilih sumber foto',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Kamera', onPress: pickFromCamera },
        { text: 'Galeri', onPress: pickFromGallery },
      ],
    );
  }, [pickFromCamera, pickFromGallery]);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!previewUri) {
      Alert.alert('Info', 'Pilih foto baru terlebih dahulu.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'Data pengguna tidak tersedia. Silakan login ulang.');
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadProfilePicture(user.id, previewUri);
      if (response.data) {
        // Update Redux store with new profile picture URL
        dispatch(
          setUser({
            user: {
              ...user,
              profile_picture_url: response.data.profile_picture_url,
            },
            area: undefined,
          }),
        );
        Alert.alert('Berhasil', 'Foto profil berhasil diperbarui.', [
          { text: 'OK', onPress: goBack },
        ]);
      } else {
        Alert.alert('Gagal', response.error || 'Gagal mengunggah foto profil.');
      }
    } catch (err) {
      Alert.alert(
        'Gagal',
        err instanceof Error ? err.message : 'Gagal mengunggah foto profil.',
      );
    } finally {
      setIsUploading(false);
    }
  }, [previewUri, user, dispatch, goBack]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const displayImageUri = previewUri ?? user?.profile_picture_url ?? null;
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '-';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <NBCard style={styles.card}>
          <NBCardContent>
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={handlePickImage}
                accessibilityLabel="Ganti foto profil"
                accessibilityHint="Ketuk untuk memilih foto baru dari kamera atau galeri"
                activeOpacity={0.75}
              >
                {displayImageUri ? (
                  <Image
                    source={{ uri: displayImageUri }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons
                      name="account-circle"
                      size={80}
                      color={nbColors.gray[400]}
                    />
                  </View>
                )}
                {/* Camera badge overlay */}
                <View style={styles.cameraBadge}>
                  <MaterialCommunityIcons
                    name="camera"
                    size={16}
                    color={nbColors.white}
                  />
                </View>
              </TouchableOpacity>

              {previewUri && (
                <View style={styles.newPhotoBadge}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={nbColors.primary}
                  />
                  <Text style={styles.newPhotoBadgeText}>Foto baru dipilih</Text>
                </View>
              )}

              <NBButton
                title="Ganti Foto Profil"
                onPress={handlePickImage}
                variant="secondary"
                size="sm"
                style={styles.changePhotoButton}
              />
            </View>
          </NBCardContent>
        </NBCard>

        {/* User info (read-only) */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>INFORMASI AKUN</Text>
          </NBCardHeader>
          <NBCardContent>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Lengkap</Text>
              <Text style={styles.infoValue}>{user?.full_name ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Peran</Text>
              <Text style={styles.infoValue}>{roleLabel}</Text>
            </View>
            {user?.phone_number && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nomor HP</Text>
                  <Text style={styles.infoValue}>{user.phone_number}</Text>
                </View>
              </>
            )}
          </NBCardContent>
        </NBCard>

        {/* Save button */}
        <View style={styles.saveContainer}>
          <NBButton
            title={isUploading ? 'Menyimpan...' : 'Simpan'}
            onPress={handleSave}
            variant="primary"
            size="lg"
            fullWidth
            loading={isUploading}
            disabled={isUploading || !previewUri}
          />
        </View>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  card: {
    marginBottom: nbSpacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: nbSpacing.sm,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
    backgroundColor: nbColors.gray[200],
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
    backgroundColor: nbColors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm,
  },
  newPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.sm,
  },
  newPhotoBadgeText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
  },
  changePhotoButton: {
    marginTop: nbSpacing.xs,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
  },
  infoLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  infoValue: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: nbBorders.thin,
    backgroundColor: nbColors.gray[200],
  },
  saveContainer: {
    marginTop: nbSpacing.xs,
  },
});
