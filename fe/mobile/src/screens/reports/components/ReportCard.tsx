/**
 * Report Card Component
 * Displays a single generated report with status and metadata
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { NBCard, NBText, NBBadge } from '../../../components/nb';
import { nbColors, nbSpacing, nbRadius } from '../../../constants/nbTokens';
import type { GeneratedReport, GeneratedReportStatus } from '../../../types/reports.types';

interface ReportCardProps {
  report: GeneratedReport;
  onPress: (report: GeneratedReport) => void;
}

export function ReportCard({ report, onPress }: ReportCardProps): React.JSX.Element {
  const { t } = useTranslation();

  const statusLabel = useMemo(() => {
    const labelMap: Record<GeneratedReportStatus, string> = {
      processing: t('reports:statusLabels.processing'),
      completed: t('reports:statusLabels.completed'),
      failed: t('reports:statusLabels.failed'),
    };
    return labelMap[report.status] || 'Unknown';
  }, [report.status, t]);

  const typeLabel = useMemo(() => {
    const typeMap: Record<string, string> = {
      daily_operations: t('reports:typeLabels.daily'),
      weekly_performance: t('reports:typeLabels.weekly'),
      monthly_summary: t('reports:typeLabels.monthly'),
      worker_performance: t('reports:typeLabels.workerPerformance'),
      area_status: t('reports:typeLabels.areaStatus'),
      overtime_utilization: t('reports:typeLabels.overtimeUtilization'),
    };
    return typeMap[report.report_type] || report.report_type;
  }, [report.report_type, t]);

  const formatLabel = useMemo(() => {
    const formatMap: Record<string, string> = {
      pdf: t('reports:formatLabels.pdf'),
      csv: t('reports:formatLabels.csv'),
      xlsx: t('reports:formatLabels.xlsx'),
    };
    return formatMap[report.format] || report.format.toUpperCase();
  }, [report.format, t]);

  const createdDate = useMemo(() => {
    try {
      const date = new Date(report.created_at);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  }, [report.created_at]);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(report)}>
      <NBCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color={nbColors.primary}
            />
          </View>
          <View style={styles.titleSection}>
            <NBText variant="h3" color="gray900" numberOfLines={1}>
              {report.title}
            </NBText>
            <NBText variant="caption" color="gray600" numberOfLines={1}>
              {typeLabel}
            </NBText>
          </View>
          <NBBadge
            text={statusLabel}
            size="sm"
            color={report.status === 'completed' ? 'success' : report.status === 'failed' ? 'danger' : 'warning'}
          />
        </View>

        <View style={styles.metadata}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="calendar"
              size={16}
              color={nbColors.gray600}
            />
            <NBText variant="caption" color="gray600">
              {createdDate}
            </NBText>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="file-export"
              size={16}
              color={nbColors.gray600}
            />
            <NBText variant="caption" color="gray600">
              {formatLabel}
            </NBText>
          </View>
        </View>

        {report.error_message && (
          <View style={styles.errorSection}>
            <NBText variant="caption" color="danger">
              {report.error_message}
            </NBText>
          </View>
        )}
      </NBCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: nbSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: nbRadius.md,
    backgroundColor: `${nbColors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  titleSection: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  metadata: {
    flexDirection: 'row',
    gap: nbSpacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  errorSection: {
    marginTop: nbSpacing.md,
    paddingTop: nbSpacing.md,
    borderTopWidth: 1,
    borderTopColor: nbColors.danger + '20',
  },
});
