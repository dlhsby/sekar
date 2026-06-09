/**
 * Edit Profile Screen (PRF-3)
 * Phase 4 M3 revamp: profile photo is the only mutable field (admin-managed
 * accounts). Identity fields are surfaced read-only in a locked card so users
 * understand the contact path for changes.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBBackgroundPattern, NBText, NBToast } from '../../components/nb';
import { RoleAvatar } from '../../components/common/RoleAvatar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser } from '../../store/slices/authSlice';
import { uploadProfilePicture } from '../../services/api/usersApi';
import { ROLE_LABELS } from '../../constants/roles';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import type { UserRole } from '../../types/models.types';
import type { MainTabScreenProps } from '../../types/navigation.types';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function EditProfileScreen(): React.JSX.Element {
  const navigation =
    useNavigation<MainTabScreenProps<'EditProfile'>['navigation']>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const assignedArea = useAppSelector((state) => state.auth.assignedArea);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const goBack = useCallback(() => navigation.navigate('Profile'), [navigation]);

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
        NBToast.show({ level: 'danger', title: 'Gagal', body: 'Gagal membuka kamera. Periksa izin akses.' });
        return;
      }
      if (result.assets?.[0]?.uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch {
      NBToast.show({ level: 'danger', title: 'Gagal', body: 'Gagal membuka kamera.' });
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
        NBToast.show({ level: 'danger', title: 'Gagal', body: 'Gagal membuka galeri. Periksa izin akses.' });
        return;
      }
      if (result.assets?.[0]?.uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch {
      NBToast.show({ level: 'danger', title: 'Gagal', body: 'Gagal membuka galeri.' });
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
      NBToast.show({ level: 'info', title: 'Info', body: 'Pilih foto baru terlebih dahulu.' });
      return;
    }
    if (!user?.id) {
      NBToast.show({ level: 'danger', title: 'Gagal', body: 'Data pengguna tidak tersedia. Silakan login ulang.' });
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadProfilePicture(user.id, previewUri);
      if (response.data) {
        dispatch(
          setUser({
            user: {
              ...user,
              profile_picture_url: response.data.profile_picture_url,
            },
            area: assignedArea ?? undefined,
          }),
        );
        NBToast.show({ level: 'success', title: 'Berhasil', body: 'Foto profil berhasil diperbarui.' });
        goBack();
      } else {
        NBToast.show({ level: 'danger', title: 'Gagal', body: response.error || 'Gagal mengunggah foto profil.' });
      }
    } catch (err) {
      NBToast.show({
        level: 'danger',
        title: 'Gagal',
        body: err instanceof Error ? err.message : 'Gagal mengunggah foto profil.',
      });
    } finally {
      setIsUploading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is seeded from assignedArea once; not meant to reset on assignedArea change
  }, [previewUri, user, dispatch, goBack]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const displayImageUri = previewUri ?? user?.profile_picture_url ?? null;
  const roleLabel = user?.role ? (ROLE_LABELS[user.role as UserRole] ?? user.role) : '—';
  const rayonName = user?.rayon?.name ?? null;
  const roleAndRayon = rayonName ? `${roleLabel} · ${rayonName}` : roleLabel;

  const lockedRows: { label: string; value: string }[] = [
    { label: 'Nama Lengkap', value: user?.full_name ?? '—' },
    { label: 'Username', value: user?.username ?? '—' },
    { label: 'Role & Rayon', value: roleAndRayon },
    ...(user?.phone_number
      ? [{ label: 'No. Handphone', value: user.phone_number }]
      : []),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + edit badge */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickImage}
            accessibilityLabel="Ganti foto profil"
            accessibilityHint="Ketuk untuk memilih foto baru dari kamera atau galeri"
            activeOpacity={0.75}
            style={styles.avatarWrapper}
          >
            <RoleAvatar
              name={user?.full_name}
              role={user?.role}
              photoUrl={displayImageUri}
              size={88}
              radius={nbRadius.base}
              withShadow
            />
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="pencil" size={14} color={nbColors.black} />
            </View>
          </TouchableOpacity>

          {previewUri ? (
            <View style={styles.newPhotoBadge}>
              <MaterialCommunityIcons name="check-circle" size={14} color={nbColors.primary} />
              <NBText variant="caption" color="primary" style={styles.newPhotoText}>
                Foto baru dipilih
              </NBText>
            </View>
          ) : null}

          <NBButton
            title="Ganti Foto Profil"
            onPress={handlePickImage}
            variant="secondary"
            size="sm"
            style={styles.changePhotoButton}
          />
        </View>

        {/* Locked account fields */}
        <NBText variant="mono-sm" color="gray600" uppercase style={styles.sectionTitle}>
          Tidak bisa diubah
        </NBText>
        <View style={styles.lockedCard}>
          {lockedRows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.lockedRow, index < lockedRows.length - 1 && styles.lockedRowDivider]}
            >
              <NBText variant="mono-sm" color="gray600" style={styles.lockedLabel}>
                {row.label}
              </NBText>
              <NBText variant="mono-sm" color="black" style={styles.lockedValue} numberOfLines={1}>
                {row.value}
              </NBText>
            </View>
          ))}
        </View>

        <NBText variant="body-sm" color="gray600" style={styles.helperNote}>
          Field yang dikunci hanya bisa diubah oleh admin sistem. Hubungi admin
          untuk perubahan data akun.
        </NBText>
      </ScrollView>

      {/* Sticky save footer */}
      <View style={styles.footer}>
        <NBButton
          title={isUploading ? 'Menyimpan...' : 'Simpan Perubahan'}
          onPress={handleSave}
          variant="primary"
          size="lg"
          fullWidth
          loading={isUploading}
          disabled={isUploading || !previewUri}
        />
      </View>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    marginBottom: nbSpacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: nbSpacing.sm,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: nbRadius.full,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.xs,
  },
  newPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.sm,
  },
  newPhotoText: {
    fontWeight: '600',
  },
  changePhotoButton: {
    marginTop: nbSpacing.xs,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
    marginLeft: nbSpacing.xs,
  },
  lockedCard: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
  },
  lockedRowDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: nbColors.gray300,
    borderStyle: 'dashed',
  },
  lockedLabel: {
    flex: 1,
  },
  lockedValue: {
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: nbSpacing.sm,
  },
  helperNote: {
    marginTop: nbSpacing.md,
    marginHorizontal: nbSpacing.xs,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.black,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
});
