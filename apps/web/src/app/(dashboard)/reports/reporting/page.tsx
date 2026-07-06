'use client';

import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/ui';
import { SpreadsheetEmbed, type SpreadsheetOption } from '@/components/spreadsheet/SpreadsheetEmbed';

// General reporting page — a select-driven list of report spreadsheets.
// Add future reports as additional entries here + a matching
// `reports:reporting.options.<key>` translation key.
const REPORT_URLS: Record<string, string> = {
  rekapPerantingan:
    'https://docs.google.com/spreadsheets/d/1SaJsreJCeoUudVlQ7-KTyUj5vSeqfxX8PPm3yz6cfe0/edit?gid=1510930746#gid=1510930746',
};

const REPORT_ORDER = ['rekapPerantingan'] as const;

export default function ReportingPage() {
  const { t } = useTranslation(['reports']);

  const options: SpreadsheetOption[] = REPORT_ORDER.map((key) => ({
    key,
    label: t(`reports:reporting.options.${key}`),
    url: REPORT_URLS[key],
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('reports:reporting.page.title')}
        description={t('reports:reporting.page.description')}
      />
      <SpreadsheetEmbed label={t('reports:reporting.selectLabel')} options={options} />
    </div>
  );
}
