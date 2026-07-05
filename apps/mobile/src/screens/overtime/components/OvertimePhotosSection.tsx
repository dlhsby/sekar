/**
 * OvertimePhotosSection — Photo gallery section (evidence photos)
 * Thin wrapper over PhotoGridSection
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoGridSection } from '../../../components/common/PhotoGridSection';

interface OvertimePhotosSectionProps {
  photoUrls?: string[];
  onPhotoPress: (uri: string) => void;
}

export const OvertimePhotosSection: React.FC<OvertimePhotosSectionProps> = ({
  photoUrls,
  onPhotoPress,
}) => {
  const { t } = useTranslation('overtime');

  if (!photoUrls || photoUrls.length === 0) return null;

  return (
    <PhotoGridSection
      photos={photoUrls}
      onPhotoPress={onPhotoPress}
      headerType="icon"
      title={t('forms.photosTitle')}
      subtitle={t('forms.photosSubtitle', { count: photoUrls.length })}
      iconName="image-multiple-outline"
    />
  );
};
