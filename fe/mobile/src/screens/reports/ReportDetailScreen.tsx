/**
 * Report Detail Screen
 * Phase 5-1: View report metadata and open/download
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Share,
  RefreshControl,
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import {
  NBBackgroundPattern,
  NBText,
  NBButton,
  NBCard,
  NBBadge,
  NBToast,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
} from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchReport,
  deleteReportThunk,
  selectSelectedReport,
  selectReportsLoading,
  selectReportsSubmitting,
} from '../../store/slices/reportsSlice';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type RouteParams = { reportId: string };

const statusColors: Record<string, any> = {
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
};

export function ReportDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<MainTabParamList, 'ReportDetail'>>();
  const navigation = useNavigation<MainTabScreenProps<'ReportDetail'>['navigation']>();
  const dispatch = useAppDispatch();

  const typeLabels: Record<string, string> = {
    daily_operations: t('reports:typeLabels.daily'),
    weekly_performance: t('reports:typeLabels.weekly'),
    monthly_summary: t('reports:typeLabels.monthly'),
    worker_performance: t('reports:typeLabels.workerPerformance'),
    area_status: t('reports:typeLabels.areaStatus'),
    overtime_utilization: t('reports:typeLabels.overtimeUtilization'),
  };

  const formatLabels: Record<string, string> = {
    pdf: t('reports:formatLabels.pdf'),
    csv: t('reports:formatLabels.csv'),
    xlsx: t('reports:formatLabels.xlsx'),
  };

  const statusLabels: Record<string, string> = {
    processing: t('reports:statusLabels.processing'),
    completed: t('reports:statusLabels.completed'),
    failed: t('reports:statusLabels.failed'),
  };

  const { reportId } = route.params as RouteParams;

  const report = useAppSelector(selectSelectedReport);
  const isLoading = useAppSelector(selectReportsLoading);
  const isSubmitting = useAppSelector(selectReportsSubmitting);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchReport(reportId));
    }, [dispatch, reportId]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchReport(reportId)).unwrap();
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, reportId]);

  const handleOpenReport = useCallback(async () => {
    if (!report?.file_url) {
      NBToast.show({
        level: 'danger',
        title: t('reports:toast.fileNotAvailable'),
        body: t('reports:toast.reportNotReady'),
      });
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(report.file_url);
      if (canOpen) {
        await Linking.openURL(report.file_url);
      } else {
        NBToast.show({
          level: 'danger',
          title: t('reports:toast.cannotOpenFile'),
          body: t('reports:toast.unsupportedFormat'),
        });
      }
    } catch {
      NBToast.show({
        level: 'danger',
        title: t('reports:toast.error.title'),
        body: t('reports:toast.error.body'),
      });
    }
  }, [report?.file_url, t]);

  const handleShare = useCallback(async () => {
    if (!report?.file_url) {
      NBToast.show({
        level: 'danger',
        title: t('reports:toast.fileNotFound'),
      });
      return;
    }

    try {
      await Share.share({
        message: `Laporan: ${report.title}`,
        url: report.file_url,
        title: report.title,
      });
    } catch {
      NBToast.show({
        level: 'danger',
        title: t('reports:toast.shareError'),
      });
    }
  }, [report, t]);

  const handleDelete = useCallback(async () => {
    if (!report) return;

    try {
      await dispatch(deleteReportThunk(report.id)).unwrap();
      NBToast.show({
        level: 'success',
        title: t('reports:toast.deleted.title'),
      });
      navigation.goBack();
    } catch {
      NBToast.show({
        level: 'danger',
        title: t('reports:toast.deleteFailed'),
      });
    }
  }, [dispatch, report, navigation, t]);

  if (isLoading && !report) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
            {t('reports:detail.loading')}
          </NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!report) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <NBText variant="body" color="gray600">
            {t('reports:detail.notFound')}
          </NBText>
          <NBButton
            title={t('reports:detail.button.back')}
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  const createdDate = new Date(report.created_at).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const completedDate = report.completed_at
    ? new Date(report.completed_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[nbColors.primary]}
              tintColor={nbColors.primary}
            />
          }
        >
          {/* Title Card */}
          <NBCard style={styles.card}>
            <View style={styles.titleHeader}>
              <View style={styles.titleContent}>
                <NBText variant="h2" color="gray900" numberOfLines={2}>
                  {report.title}
                </NBText>
                <NBText variant="body-sm" color="gray600" style={styles.subtitle}>
                  {typeLabels[report.report_type] || report.report_type}
                </NBText>
              </View>
              <NBBadge
                text={statusLabels[report.status] || report.status}
                color={statusColors[report.status] || 'gray'}
              />
            </View>
          </NBCard>

          {/* Status & Timeline Card */}
          <NBCard style={styles.card}>
            <NBText variant="h3" color="gray900" style={styles.sectionTitle}>
              {t('reports:detail.section.statusTimeline')}
            </NBText>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={18}
                  color={nbColors.gray600}
                />
                <NBText variant="body-sm" color="gray700">
                  {t('reports:detail.info.created')}
                </NBText>
              </View>
              <NBText variant="body-sm" color="gray600">
                {createdDate}
              </NBText>
            </View>

            {report.started_at && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <MaterialCommunityIcons
                    name="play-circle"
                    size={18}
                    color={nbColors.warning}
                  />
                  <NBText variant="body-sm" color="gray700">
                    {t('reports:detail.info.started')}
                  </NBText>
                </View>
                <NBText variant="body-sm" color="gray600">
                  {new Date(report.started_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </NBText>
              </View>
            )}

            {completedDate && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={nbColors.success}
                  />
                  <NBText variant="body-sm" color="gray700">
                    {t('reports:detail.info.completed')}
                  </NBText>
                </View>
                <NBText variant="body-sm" color="gray600">
                  {completedDate}
                </NBText>
              </View>
            )}

            {report.error_message && (
              <View style={[styles.infoRow, styles.errorRow]}>
                <View style={styles.infoLabel}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={18}
                    color={nbColors.danger}
                  />
                  <NBText variant="body-sm" color="danger">
                    {t('reports:detail.info.error')}
                  </NBText>
                </View>
              </View>
            )}
            {report.error_message && (
              <NBText variant="caption" color="danger" style={styles.errorMessage}>
                {report.error_message}
              </NBText>
            )}
          </NBCard>

          {/* Metadata Card */}
          <NBCard style={styles.card}>
            <NBText variant="h3" color="gray900" style={styles.sectionTitle}>
              {t('reports:detail.section.details')}
            </NBText>

            <View style={styles.infoRow}>
              <NBText variant="body-sm" color="gray700">
                {t('reports:detail.label.format')}
              </NBText>
              <NBText variant="body-sm" color="gray600">
                {formatLabels[report.format] || report.format.toUpperCase()}
              </NBText>
            </View>

            {report.file_size_bytes && (
              <View style={styles.infoRow}>
                <NBText variant="body-sm" color="gray700">
                  {t('reports:detail.label.fileSize')}
                </NBText>
                <NBText variant="body-sm" color="gray600">
                  {(report.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                </NBText>
              </View>
            )}

            {report.parameters && Object.keys(report.parameters).length > 0 && (
              <>
                <View style={styles.parametersSeparator} />
                <NBText variant="body-sm" color="gray700" style={styles.parametersTitle}>
                  {t('reports:detail.label.parameters')}
                </NBText>
                {Object.entries(report.parameters).map(([key, value]) => (
                  <View key={key} style={styles.infoRow}>
                    <NBText variant="caption" color="gray600">
                      {key}
                    </NBText>
                    <NBText variant="caption" color="gray600">
                      {String(value)}
                    </NBText>
                  </View>
                ))}
              </>
            )}
          </NBCard>

          {/* Action Buttons */}
          {report.status === 'completed' && report.file_url && (
            <View style={styles.actionGroup}>
              <NBButton
                title={t('reports:detail.button.openDownload')}
                variant="primary"
                size="lg"
                leftIcon="download"
                onPress={handleOpenReport}
                disabled={isSubmitting}
                style={styles.actionButton}
              />
              <NBButton
                title={t('reports:detail.button.share')}
                variant="secondary"
                size="lg"
                leftIcon="share-variant"
                onPress={handleShare}
                disabled={isSubmitting}
                style={styles.actionButton}
              />
            </View>
          )}

          {/* Delete Button */}
          <NBButton
            title={t('reports:detail.button.delete')}
            variant="secondary"
            size="lg"
            onPress={handleDelete}
            disabled={isSubmitting}
            style={styles.deleteButton}
          />
        </ScrollView>
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  backButton: {
    marginTop: nbSpacing.lg,
  },
  card: {
    marginBottom: nbSpacing.lg,
  },
  titleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: nbSpacing.md,
  },
  titleContent: {
    flex: 1,
  },
  subtitle: {
    marginTop: nbSpacing.sm,
  },
  sectionTitle: {
    marginBottom: nbSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${nbColors.gray200}`,
  },
  infoRow_last: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
  },
  errorRow: {
    marginTop: nbSpacing.md,
  },
  errorMessage: {
    marginTop: nbSpacing.sm,
  },
  parametersSeparator: {
    height: 1,
    backgroundColor: nbColors.gray200,
    marginVertical: nbSpacing.md,
  },
  parametersTitle: {
    marginBottom: nbSpacing.sm,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: nbSpacing.md,
    marginBottom: nbSpacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    marginBottom: nbSpacing.lg,
  },
});
