/**
 * PhotosSection — displays photo gallery with tap-to-enlarge
 * Thin wrapper over PhotoGridSection
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoGridSection } from '../../../components/common/PhotoGridSection';
import type { PruningRequest } from '../../../types/models.types';

interface PhotosSectionProps {
  request: PruningRequest;
  onPhotoPress: (photoUrl: string) => void;
}

export function PhotosSection({
  request,
  onPhotoPress,
}: PhotosSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!request.photoUrls || request.photoUrls.length === 0) {
    return null;
  }

  return (
    <PhotoGridSection
      photos={request.photoUrls}
      onPhotoPress={onPhotoPress}
      headerType="emoji"
      title={t('pruning:photosSection.title')}
      count={request.photoUrls.length}
    />
  );
}
