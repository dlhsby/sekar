/**
 * OvertimePhotosSection — Photo gallery section (evidence photos)
 * Thin wrapper over PhotoGridSection
 */

import React from 'react';
import { PhotoGridSection } from '../../../components/common/PhotoGridSection';

interface OvertimePhotosSectionProps {
  photoUrls?: string[];
  onPhotoPress: (uri: string) => void;
}

export const OvertimePhotosSection: React.FC<OvertimePhotosSectionProps> = ({
  photoUrls,
  onPhotoPress,
}) => {
  if (!photoUrls || photoUrls.length === 0) return null;

  return (
    <PhotoGridSection
      photos={photoUrls}
      onPhotoPress={onPhotoPress}
      headerType="icon"
      title="FOTO BUKTI"
      subtitle={`${photoUrls.length} foto dilampirkan`}
      iconName="image-multiple-outline"
    />
  );
};
