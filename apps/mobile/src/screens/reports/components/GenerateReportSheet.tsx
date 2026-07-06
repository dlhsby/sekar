/**
 * Generate Report Sheet Component
 * Inline form for generating a new report within a bottom sheet
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  NBButton,
  NBSelect,
  NBText,
  NBModal,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
} from '../../../constants/nbTokens';
import type { ReportType, ReportFormat } from '../../../types/reports.types';

interface GenerateReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reportType: ReportType;
    format: string;
  }) => void;
  isSubmitting: boolean;
  templates: Array<{ id: string; name: string; report_type: string }>;
}

export function GenerateReportSheet({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  templates,
}: GenerateReportSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<ReportType | ''>('');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat | ''>('');

  const typeOptions = useMemo(
    () =>
      templates.map((t) => ({
        label: t.name,
        value: t.report_type,
      })),
    [templates],
  );

  const formatOptions = useMemo(
    () => [
      { label: t('reports:formatLabels.pdf'), value: 'pdf' },
      { label: t('reports:formatLabels.csv'), value: 'csv' },
      { label: t('reports:formatLabels.xlsx'), value: 'xlsx' },
    ],
    [t],
  );

  const canSubmit = selectedType !== '' && selectedFormat !== '';

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit({
        reportType: selectedType as ReportType,
        format: selectedFormat,
      });
      setSelectedType('');
      setSelectedFormat('');
    }
  };

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      type="sheet"
      title={t('reports:modal.title')}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        scrollEnabled
      >
        <View style={styles.section}>
          <NBText variant="h3" color="gray900" style={styles.label}>
            {t('reports:modal.label.type')}
          </NBText>
          <NBSelect
            placeholder={t('reports:modal.placeholder.type')}
            options={typeOptions}
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as ReportType)}
          />
        </View>

        <View style={styles.section}>
          <NBText variant="h3" color="gray900" style={styles.label}>
            {t('reports:modal.label.format')}
          </NBText>
          <NBSelect
            placeholder={t('reports:modal.placeholder.format')}
            options={formatOptions}
            value={selectedFormat}
            onValueChange={(value) => setSelectedFormat(value as ReportFormat)}
          />
        </View>

        <View style={styles.buttonGroup}>
          <NBButton
            title={t('reports:modal.button.cancel')}
            variant="secondary"
            onPress={onClose}
            disabled={isSubmitting}
            style={styles.button}
          />
          <NBButton
            title={isSubmitting ? '' : t('reports:modal.button.create')}
            variant="primary"
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={styles.button}
          >
            {isSubmitting && (
              <ActivityIndicator
                size="small"
                color={nbColors.white}
                style={styles.spinner}
              />
            )}
          </NBButton>
        </View>
      </ScrollView>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.lg,
  },
  section: {
    marginBottom: nbSpacing.lg,
  },
  label: {
    marginBottom: nbSpacing.sm,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: nbSpacing.md,
    marginTop: nbSpacing.lg,
  },
  button: {
    flex: 1,
  },
  spinner: {
    marginRight: nbSpacing.sm,
  },
});
