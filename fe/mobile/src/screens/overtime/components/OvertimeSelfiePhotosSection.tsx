/**
 * OvertimeSelfiePhotosSection — Clock-in/out selfie verification photos
 * Thin wrapper over PhotoGridSection
 */

import React from 'react';
import { PhotoGridSection } from '../../../components/common/PhotoGridSection';

interface OvertimeSelfiePhotosSectionProps {
  shift?: { clock_in_photo_url?: string | null; clock_out_photo_url?: string | null } | null;
  onPhotoPress: (uri: string) => void;
}

export const OvertimeSelfiePhotosSection: React.FC<OvertimeSelfiePhotosSectionProps> = ({
  shift,
  onPhotoPress,
}) => {
  if (!shift || (!shift.clock_in_photo_url && !shift.clock_out_photo_url)) return null;

  const photos: Array<{ url: string; label?: string }> = [];
  if (shift.clock_in_photo_url) {
    photos.push({ url: shift.clock_in_photo_url, label: 'Mulai Lembur' });
  }
  if (shift.clock_out_photo_url) {
    photos.push({ url: shift.clock_out_photo_url, label: 'Selesai Lembur' });
  }

  return (
    <PhotoGridSection
      photos={photos}
      onPhotoPress={onPhotoPress}
      headerType="icon"
      title="SELFIE VERIFIKASI"
      iconName="account-circle-outline"
    />
  );
};
