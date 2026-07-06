'use client';

import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/ui';
import { SpreadsheetEmbed, type SpreadsheetOption } from '@/components/spreadsheet/SpreadsheetEmbed';

const DATABASE_SHEET_URLS: Record<string, string> = {
  simontana:
    'https://docs.google.com/spreadsheets/d/1RSzUWkSs5Kzw4s4GZT-b2lzgaboKSPOBz8HmKkb-jGo/edit?gid=918679431#gid=918679431',
  simonsinis:
    'https://docs.google.com/spreadsheets/d/1Wq93QZ4y1BfYtzxHwr1josUK7bpTais3ayIfTNd3Bmk/edit?gid=1939591880#gid=1939591880',
  rekapPengadaan:
    'https://docs.google.com/spreadsheets/d/1iEj-cSVTAv-kWMoGSCvp17dJNfq07q-O6Kq8mDpq6oA/edit?gid=1296016472#gid=1296016472',
  dataKendaraanRayon:
    'https://docs.google.com/spreadsheets/d/1LMu_9j_ksENeITOZQrqSSEQF6YKT_6KmhUhDF_mFEJk/edit?gid=322916706#gid=322916706',
  dataInventoryTaman:
    'https://docs.google.com/spreadsheets/d/1yhwXZhgLcGvn_-RznFAdg_ZtL81zcjn_pEN3kb9dnx8/edit?gid=854545279#gid=854545279',
  databaseBuMaria:
    'https://docs.google.com/spreadsheets/d/1jbd9kbnPoxrOWhZaU7QjSYzLxZbMSj3L/edit?gid=545239282#gid=545239282',
  dataPersonilSatgasAsb:
    'https://docs.google.com/spreadsheets/d/1LnWJiOi4SbRADJJPXAbTJrP_Z9I7LzcYqHagQk_2amE/edit?hl=id&pli=1&gid=393395549#gid=393395549',
  dataPerawatanTanaman:
    'https://docs.google.com/spreadsheets/d/1YPFV1be0zdqT52PiEMqbmYOqldP0fhx-iW_R7Z7Pq_g/edit?gid=0#gid=0',
  dataRutePenyiraman:
    'https://docs.google.com/spreadsheets/d/1bv0nnjZxrp7tHRjZ-vtrPPcV_oNCHQ4dq3tXm8iTOmU/edit?gid=1010895981#gid=1010895981',
};

const DATABASE_SHEET_ORDER = [
  'simontana',
  'simonsinis',
  'rekapPengadaan',
  'dataKendaraanRayon',
  'dataInventoryTaman',
  'databaseBuMaria',
  'dataPersonilSatgasAsb',
  'dataPerawatanTanaman',
  'dataRutePenyiraman',
] as const;

export default function DatabasePage() {
  const { t } = useTranslation(['database']);

  const options: SpreadsheetOption[] = DATABASE_SHEET_ORDER.map((key) => ({
    key,
    label: t(`database:tabs.${key}`),
    url: DATABASE_SHEET_URLS[key],
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t('database:page.title')} description={t('database:page.description')} />
      <SpreadsheetEmbed label={t('database:page.title')} options={options} />
    </div>
  );
}
