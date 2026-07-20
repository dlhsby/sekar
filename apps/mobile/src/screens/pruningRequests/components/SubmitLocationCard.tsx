/**
 * SubmitLocationCard — Location input: GPS, district, kecamatan, address, map picker.
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBTextInput,
  NBSelect,
  NBButton,
  NBText,
} from '../../../components/nb';
import { LocationPickerModal } from '../../../components/modals/LocationPickerModal';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../../constants/nbTokens';
import type { User } from '../../../types/models.types';

interface SubmitLocationCardProps {
  user: User | null;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAccuracy: number | null;
  gpsError: string | null;
  gpsLoading: boolean;
  captureLocation: () => Promise<void>;
  address: string;
  setAddress: (v: string) => void;
  districts: Array<{ id: string; name: string }>;
  districtId: string;
  setDistrictId: (v: string) => void;
  kecamatanName: string;
  setKecamatanName: (v: string) => void;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  setGpsLat: (v: number) => void;
  setGpsLng: (v: number) => void;
  setGpsError: (v: string | null) => void;
  setGpsAccuracy: (v: number | null) => void;
}

const styles = {
  card: { marginBottom: nbSpacing[4] },
  fieldGroup: { marginBottom: nbSpacing[3] },
  gpsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: nbSpacing[2],
  },
  gpsValues: { flex: 1 },
  gpsRefresh: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    marginLeft: nbSpacing[2],
  },
  presetLabel: {
    color: nbColors.gray600,
    textTransform: 'uppercase' as const,
    marginBottom: nbSpacing[1],
  },
  helper: {
    color: nbColors.gray600,
    marginTop: nbSpacing[2],
  },
  addressTextArea: {
    minHeight: 110,
    textAlignVertical: 'top' as const,
    paddingTop: nbSpacing[2],
  },
};

export function SubmitLocationCard(props: SubmitLocationCardProps) {
  const { t } = useTranslation('pruning');
  const {
    user,
    gpsLat,
    gpsLng,
    gpsAccuracy,
    gpsError,
    gpsLoading,
    captureLocation,
    address,
    setAddress,
    districts,
    districtId,
    setDistrictId,
    kecamatanName,
    setKecamatanName,
    pickerOpen,
    setPickerOpen,
    setGpsLat,
    setGpsLng,
    setGpsError,
    setGpsAccuracy,
  } = props;

  const handleMapConfirm = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      setGpsLat(lat);
      setGpsLng(lng);
      setGpsError(null);
      setGpsAccuracy(null);
    },
    [setGpsLat, setGpsLng, setGpsError, setGpsAccuracy],
  );

  const isStaffKecamatan = user?.role === 'staff_kecamatan';

  return (
    <>
      <NBCard style={styles.card}>
        <NBCardHeader>
          <NBText variant="h3">{t('submit.locationCardTitleRequired')}</NBText>
        </NBCardHeader>
        <NBCardContent>
          {/* Rayon + Kecamatan — pre-filled from logged-in user, rendered
              as disabled NBSelects for staff_kecamatan. */}
          {isStaffKecamatan ? (
            <>
              <View style={styles.fieldGroup} testID="perantingan-district-readonly">
                <NBSelect
                  label={t('submit.districtLabel')}
                  value={districtId || 'unset'}
                  onValueChange={() => {}}
                  options={[{
                    label: districts.find((r) => r.id === districtId)?.name ?? t('submit.notSetLabel'),
                    value: districtId || 'unset',
                  }]}
                  disabled
                />
              </View>
              <View style={styles.fieldGroup} testID="perantingan-kecamatan-readonly">
                <NBSelect
                  label={t('submit.kecamatanLabel')}
                  value={kecamatanName || 'unset'}
                  onValueChange={() => {}}
                  options={[{
                    label: kecamatanName || t('submit.notSetLabel'),
                    value: kecamatanName || 'unset',
                  }]}
                  disabled
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <NBSelect
                  label={t('submit.districtLabel')}
                  value={districtId || (districts[0]?.id ?? '')}
                  onValueChange={(v) => setDistrictId(String(v))}
                  options={districts.map((r) => ({ label: r.name, value: r.id }))}
                  searchable
                  disabled={districts.length === 0}
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label={t('submit.kecamatanLabel')}
                  placeholder={t('submit.kecamatanPlaceholder')}
                  value={kecamatanName}
                  onChangeText={setKecamatanName}
                />
              </View>
            </>
          )}

          {/* Alamat / Jalan */}
          <View style={styles.fieldGroup}>
            <NBTextInput
              label={t('submit.addressLabel')}
              placeholder={t('submit.addressPlaceholder')}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={5}
              inputStyle={styles.addressTextArea}
            />
          </View>

          {/* GPS auto-capture display + refresh */}
          <View style={styles.gpsRow}>
            <View style={styles.gpsValues}>
              <NBText variant="caption" style={styles.presetLabel}>{t('submit.gpsCoordinatesLabel')}</NBText>
              {gpsLat != null && gpsLng != null ? (
                <NBText variant="body-sm">
                  {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
                  {gpsAccuracy ? ` (±${Math.round(gpsAccuracy)} m)` : ''}
                </NBText>
              ) : (
                <NBText variant="body-sm" style={{ color: nbColors.gray600 }}>
                  {gpsLoading ? t('submit.gpsDetecting') : t('submit.gpsNotAvailable')}
                </NBText>
              )}
            </View>
            <TouchableOpacity
              onPress={captureLocation}
              disabled={gpsLoading}
              style={styles.gpsRefresh}
              accessibilityRole="button"
              accessibilityLabel={t('submit.gpsUpdateButtonLabel')}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color={nbColors.black} />
              ) : (
                <MaterialCommunityIcons name="refresh" size={22} color={nbColors.black} />
              )}
            </TouchableOpacity>
          </View>

          {/* Map picker button */}
          <View style={{ marginTop: nbSpacing[2] }}>
            <NBButton
              title={t('submit.mapButtonTitle')}
              leftIcon="map-marker-radius"
              variant="secondary"
              onPress={() => setPickerOpen(true)}
              testID="perantingan-pick-on-map"
            />
          </View>

          {gpsError ? (
            <NBText variant="body-sm" style={{ color: nbColors.danger, marginTop: nbSpacing[2] }}>
              {gpsError}
            </NBText>
          ) : null}
        </NBCardContent>
      </NBCard>

      <LocationPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initial={gpsLat != null && gpsLng != null ? { lat: gpsLat, lng: gpsLng } : null}
        onConfirm={handleMapConfirm}
      />
    </>
  );
}
