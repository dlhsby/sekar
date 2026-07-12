/**
 * BoundaryDetailModal Component
 * Phase 2D Gap #2: rayon/area staffing detail when a center marker is tapped.
 *
 * Phase 4 M3 (CP7): rebuilt onto the UserDetailSheet design language —
 * NBModal sheet + a hero header (type-tinted icon chip · name · sub-line ·
 * StatusPill), HomeStatTile KPI row, tokenised staffing rows, and a nested
 * "Tanaman" sub-sheet (plant status + heritage trees) mirroring UserDetailSheet's
 * task/activity sub-sheets.
 *   Rayon mode: KPI (Area · Kurang staf) + list of areas with an understaffed pill.
 *   Area mode:  KPI (Aktif · Petugas) + per-role staffing rows + Reassign + Tanaman.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { NBModal } from '../nb/NBModal';
import { HomeStatTile } from '../home/HomeStatTile';
import { StatusPill } from '../home/StatusPill';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import type {
  RayonBoundary,
  AreaBoundary,
  UserRole,
  AreaPlant,
  NotablePlant,
} from '../../types/models.types';
import { listLocationPlants, listNotablePlants } from '../../services/api/plantsApi';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoundaryDetailModalProps {
  type: 'rayon' | 'location';
  data: RayonBoundary | AreaBoundary | null;
  visible: boolean;
  onClose: () => void;
  onReassign?: (area: AreaBoundary) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BoundaryDetailModal({
  type,
  data,
  visible,
  onClose,
  onReassign,
}: BoundaryDetailModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const isRayon = type === 'rayon';
  const rayonData = !data ? null : isRayon ? (data as RayonBoundary) : null;
  const areaData = !data ? null : !isRayon ? (data as AreaBoundary) : null;

  // Phase 3 sub-phase 3-8 hookup: fetch plants for the selected area so the
  // "Tanaman" sub-sheet shows status mix + heritage trees. The rayon-scoped
  // "Permohonan Pangkas" section was intentionally dropped — pruning_requests
  // are rayon-scoped, not area-scoped.
  const [plants, setPlants] = useState<AreaPlant[]>([]);
  const [notable, setNotable] = useState<NotablePlant[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [plantsOpen, setPlantsOpen] = useState(false);

  useEffect(() => {
    if (!visible || isRayon || !areaData) {
      setPlants([]);
      setNotable([]);
      setPlantsOpen(false);
      return;
    }
    let cancelled = false;
    const areaId = areaData.id;

    setLoadingPlants(true);
    Promise.all([listLocationPlants(areaId), listNotablePlants(areaId)])
      .then(([plantsRes, notableRes]) => {
        if (cancelled) { return; }
        setPlants(plantsRes.data ?? []);
        setNotable(notableRes.data ?? []);
      })
      .catch(() => {
        if (cancelled) { return; }
        setPlants([]);
        setNotable([]);
      })
      .finally(() => {
        if (!cancelled) { setLoadingPlants(false); }
      });

    return () => {
      cancelled = true;
    };
    // Key on the area ID, not the object — reopening the same area with a fresh
    // object reference still refetches, but an unrelated re-render won't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isRayon, areaData?.id]);

  const isOpen = visible && !!data;

  // Understaffed → "Understaffed" (bad); otherwise "Cukup" (ok). Both rayon and
  // area carry `is_understaffed`.
  const understaffed = isRayon
    ? rayonData?.is_understaffed
    : areaData?.is_understaffed;

  return (
    <>
      <NBModal visible={isOpen} onClose={onClose} type="sheet" testID="boundary-detail-sheet">
        {data ? (
          <>
            {/* Hero header — type-tinted icon chip · name · sub-line · pill */}
            <View style={styles.hero}>
              <View style={styles.iconChip}>
                <MaterialCommunityIcons
                  name={isRayon ? 'office-building' : 'map-marker'}
                  size={22}
                  color={isRayon ? nbColors.requestUnderReview : nbColors.statusIdle}
                />
              </View>
              <View style={styles.heroInfo}>
                <NBText variant="h3" color="black" numberOfLines={2}>
                  {isRayon ? rayonData!.name : areaData!.name}
                </NBText>
                <NBText variant="mono-sm" color="gray600">
                  {isRayon
                    ? `${rayonData!.area_count} area`
                    : areaData!.rayon_name}
                </NBText>
              </View>
              <StatusPill
                dot
                tone={understaffed ? 'bad' : 'ok'}
                label={understaffed ? t('monitoring:boundaryDetail.understaffed') : t('monitoring:boundaryDetail.sufficient')}
              />
            </View>

            {/* KPI tiles */}
            <View style={styles.statRow}>
              {isRayon && rayonData ? (
                <>
                  <HomeStatTile
                    label={t('monitoring:boundaryDetail.areaLabel')}
                    value={rayonData.area_count}
                    testID="boundary-stat-area-count"
                  />
                  <HomeStatTile
                    label={t('monitoring:boundaryDetail.understaffedLabel')}
                    value={rayonData.understaffed_area_count}
                    variant={rayonData.understaffed_area_count > 0 ? 'warn' : 'ok'}
                    testID="boundary-stat-understaffed"
                  />
                </>
              ) : areaData ? (
                <>
                  <HomeStatTile
                    label={t('monitoring:boundaryDetail.activeLabel')}
                    value={`${areaData.total_active}/${areaData.total_required}`}
                    variant={areaData.is_understaffed ? 'bad' : 'ok'}
                    testID="boundary-stat-active"
                  />
                  <HomeStatTile
                    label={t('monitoring:boundaryDetail.assignedLabel')}
                    value={areaData.assigned_count}
                    detail={t('monitoring:boundaryDetail.assignedDetail')}
                    testID="boundary-stat-assigned"
                  />
                </>
              ) : null}
            </View>

            {/* Rayon mode: list of areas */}
            {isRayon && rayonData ? (
              <View style={styles.section}>
                <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionTitle}>
                  {t('monitoring:boundaryDetail.areaListTitle')} ({rayonData.areas.length})
                </NBText>
                {rayonData.areas.length === 0 ? (
                  <NBText variant="body-sm" color="gray500" align="center">
                    {t('monitoring:boundaryDetail.noAreasMessage')}
                  </NBText>
                ) : (
                  rayonData.areas.map(area => (
                    <View key={area.id} style={styles.areaRow}>
                      <View style={styles.areaRowLeft}>
                        <NBText variant="body" color="black">{area.name}</NBText>
                        <NBText variant="mono-sm" color="gray600">
                          {area.total_active}/{area.total_required} {t('monitoring:boundaryDetail.activeCount')}
                        </NBText>
                      </View>
                      <StatusPill
                        dot
                        tone={area.is_understaffed ? 'bad' : 'ok'}
                        label={area.is_understaffed ? t('monitoring:boundaryDetail.understaffedCount') : t('monitoring:boundaryDetail.sufficient')}
                      />
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {/* Area mode: per-role staffing + reassign + tanaman sub-sheet */}
            {!isRayon && areaData ? (
              <>
                <View style={styles.section}>
                  <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionTitle}>
                    {t('monitoring:boundaryDetail.staffingTitle')}
                  </NBText>
                  {(areaData.staffing ?? []).length === 0 ? (
                    <NBText variant="body-sm" color="gray500" align="center">
                      {t('monitoring:boundaryDetail.noStaffingMessage')}
                    </NBText>
                  ) : (
                    (areaData.staffing ?? []).map(item => {
                      const delta = item.active - item.required;
                      return (
                        <View key={item.role} style={styles.roleRow}>
                          <NBText variant="body-sm" color="black" style={styles.roleLabel}>
                            {ROLE_LABELS[item.role as UserRole] ?? item.role}
                          </NBText>
                          <NBText variant="mono-sm" color="gray600" style={styles.roleCount}>
                            {item.active}/{item.required}
                          </NBText>
                          <StatusPill
                            tone={delta >= 0 ? 'ok' : 'bad'}
                            label={delta >= 0 ? `+${delta}` : String(delta)}
                          />
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Reassign — only for understaffed areas with a handler */}
                {areaData.is_understaffed && onReassign ? (
                  <NBButton
                    variant="primary"
                    title={t('monitoring:boundaryDetail.reassignButton')}
                    leftIcon="account-arrow-right"
                    onPress={() => onReassign(areaData)}
                    size="md"
                    fullWidth
                    style={styles.reassignBtn}
                  />
                ) : null}

                {/* Tanaman — opens the plant status + heritage sub-sheet */}
                <TouchableOpacity
                  style={styles.subSheetTrigger}
                  onPress={() => setPlantsOpen(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('monitoring:boundaryDetail.plantsTrigger')}
                  testID="boundary-tanaman-trigger"
                >
                  <MaterialCommunityIcons name="tree" size={20} color={nbColors.successDark} />
                  <View style={styles.subSheetTriggerText}>
                    <NBText variant="body" color="black">{t('monitoring:boundaryDetail.plantsLabel')}</NBText>
                    <NBText variant="mono-sm" color="gray600">
                      {loadingPlants
                        ? t('monitoring:boundaryDetail.plantsLoading')
                        : t('monitoring:boundaryDetail.plantsCount', { count: plants.length, notable: notable.length })}
                    </NBText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={nbColors.gray400} />
                </TouchableOpacity>
              </>
            ) : null}
          </>
        ) : null}
      </NBModal>

      {/* ─── Tanaman sub-sheet (area only) ─────────────────────────────────── */}
      {areaData ? (
        <NBModal
          visible={plantsOpen}
          onClose={() => setPlantsOpen(false)}
          type="sheet"
          title={t('monitoring:boundaryDetail.plantsSheetTitle', { name: areaData.name })}
          testID="boundary-tanaman-sheet"
        >
          {loadingPlants ? (
            <NBText variant="body-sm" color="gray600" align="center">
              {t('monitoring:boundaryDetail.plantsLoading')}
            </NBText>
          ) : plants.length === 0 ? (
            <NBText variant="body" color="gray600" align="center">
              {t('monitoring:boundaryDetail.plantsEmpty')}
            </NBText>
          ) : (
            <PlantSummaryBlock plants={plants} />
          )}

          {notable.length > 0 ? (
            <View style={styles.heritageSection}>
              <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionTitle}>
                {t('monitoring:boundaryDetail.heritageTitle')} ({notable.length})
              </NBText>
              {notable.map(n => (
                <View key={n.id} style={styles.heritageRow}>
                  <MaterialCommunityIcons name="tree" size={14} color={nbColors.successDark} />
                  <NBText variant="body-sm" color="gray800" style={styles.heritageLabel}>
                    {n.label ?? t('monitoring:boundaryDetail.noLabel')}
                    {n.species?.nameId ? ` · ${formatSpeciesName(n.species.nameId)}` : ''}
                  </NBText>
                </View>
              ))}
            </View>
          ) : null}
        </NBModal>
      ) : null}
    </>
  );
}

// ─── Plant sub-components ─────────────────────────────────────────────────────

/**
 * Convert backend `name_id` (e.g. `KETAPANG_KENCANA`) into display form
 * (`Ketapang Kencana`). Falls back to a localized label when the
 * species relation isn't loaded.
 */
function formatSpeciesName(nameId: string | null | undefined): string {
  if (!nameId) { return i18n.t('monitoring:boundaryDetail.unknownSpecies'); }
  return nameId
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface PlantSummaryBlockProps {
  plants: AreaPlant[];
}

function PlantSummaryBlock({ plants }: PlantSummaryBlockProps): React.JSX.Element {
  let okCount = 0;
  let dueCount = 0;
  let overdueCount = 0;
  for (const p of plants) {
    const status = p.status as string;
    if (status === 'overdue') { overdueCount += 1; }
    else if (status === 'due' || status === 'due_soon') { dueCount += 1; }
    else if (status === 'ok') { okCount += 1; }
  }
  const totalCount = plants.reduce((acc, p) => acc + (p.count ?? 0), 0);

  return (
    <View>
      <View style={styles.statRow}>
        <HomeStatTile label={i18n.t('monitoring:boundaryDetail.okLabel')} value={okCount} variant="ok" />
        <HomeStatTile label={i18n.t('monitoring:boundaryDetail.almostLabel')} value={dueCount} variant="warn" />
        <HomeStatTile label={i18n.t('monitoring:boundaryDetail.overdueLabel')} value={overdueCount} variant="bad" />
      </View>
      <NBText variant="mono-sm" color="gray600" style={styles.plantSubLabel}>
        {plants.length} {i18n.t('monitoring:boundaryDetail.plantTypesLabel')} · {totalCount} {i18n.t('monitoring:boundaryDetail.plantCountLabel')}
      </NBText>
      {plants.slice(0, 5).map(p => {
        const status = p.status as string;
        const tone: 'ok' | 'warn' | 'bad' =
          status === 'overdue' ? 'bad' : status === 'due' || status === 'due_soon' ? 'warn' : 'ok';
        const label = status === 'overdue' ? i18n.t('monitoring:boundaryDetail.overdueStatusLabel') : status === 'due' || status === 'due_soon' ? i18n.t('monitoring:boundaryDetail.almostStatusLabel') : i18n.t('monitoring:boundaryDetail.okStatusLabel');
        const speciesName = formatSpeciesName(p.species?.nameId);
        const lastPruned = p.lastPrunedAt
          ? new Date(p.lastPrunedAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : i18n.t('monitoring:boundaryDetail.neverPrunedLabel');
        return (
          <View key={p.id} style={styles.plantRow}>
            <View style={styles.plantRowLeft}>
              <NBText variant="body-sm" color="black">{speciesName}</NBText>
              <NBText variant="caption" color="gray600">
                {i18n.t("monitoring:boundaryDetail.treeSeparator", { count: p.count })} {lastPruned}
              </NBText>
            </View>
            <StatusPill tone={tone} label={label} />
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nbSpacing.sm,
    paddingBottom: nbSpacing.md,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  iconChip: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.gray100,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
  },
  heroInfo: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.md,
  },
  section: {
    gap: nbSpacing.xs,
    paddingBottom: nbSpacing.sm,
  },
  sectionTitle: {
    letterSpacing: 0.4,
    marginBottom: nbSpacing.xs,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    backgroundColor: nbColors.gray100,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray200,
    borderRadius: nbRadius.base,
  },
  areaRowLeft: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  roleLabel: {
    flex: 1,
  },
  roleCount: {
    minWidth: 44,
    textAlign: 'right',
  },
  reassignBtn: {
    marginBottom: nbSpacing.sm,
  },
  subSheetTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    minHeight: 44,
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
  },
  subSheetTriggerText: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  heritageSection: {
    marginTop: nbSpacing.md,
    gap: nbSpacing.xs,
  },
  heritageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    paddingVertical: 4,
  },
  heritageLabel: {
    flex: 1,
  },
  plantSubLabel: {
    marginBottom: nbSpacing.sm,
  },
  plantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray200,
  },
  plantRowLeft: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
});
