import { toCsv } from './csv.exporter';
import { toXlsx } from './excel.exporter';
import { toKmz } from './kmz.exporter';
import type { Dataset } from './dataset';

const dataset: Dataset = {
  headers: ['id', 'name', 'note'],
  rows: [
    ['1', 'Taman Bungkul', 'plain'],
    ['2', 'Komma, "quote"', 'line\nbreak'],
    ['3', 'null-cell', null],
  ],
};

describe('csv exporter', () => {
  it('emits a header row and escapes commas, quotes and newlines', () => {
    const { buffer, extension, contentType } = toCsv(dataset);
    const text = buffer.toString('utf-8');

    expect(extension).toBe('csv');
    expect(contentType).toContain('text/csv');
    expect(text).toContain('id,name,note');
    expect(text).toContain('"Komma, ""quote"""');
    expect(text).toContain('"line\nbreak"');
  });

  it('renders null/undefined cells as empty fields', () => {
    const text = toCsv(dataset).buffer.toString('utf-8');
    expect(text.trim().endsWith('3,null-cell,')).toBe(true);
  });
});

describe('excel exporter', () => {
  it('produces a non-empty XLSX (zip) buffer', async () => {
    const { buffer, extension } = await toXlsx(dataset, 'sheet');
    expect(extension).toBe('xlsx');
    // XLSX is a zip archive — starts with the PK signature.
    expect(buffer.slice(0, 2).toString('latin1')).toBe('PK');
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('kmz exporter', () => {
  it('zips KML placemarks with point and polygon geometry', async () => {
    const { buffer, extension, contentType } = await toKmz([
      {
        name: 'Area A',
        description: 'addr',
        latitude: -7.29,
        longitude: 112.73,
        polygon: [
          { latitude: -7.29, longitude: 112.73 },
          { latitude: -7.3, longitude: 112.74 },
          { latitude: -7.28, longitude: 112.75 },
        ],
      },
    ]);

    expect(extension).toBe('kmz');
    expect(contentType).toContain('google-earth');
    expect(buffer.slice(0, 2).toString('latin1')).toBe('PK');
  });

  it('escapes XML special characters in placemark names', async () => {
    const JSZip = await import('jszip');
    const { buffer } = await toKmz([
      { name: 'A & B <test>', latitude: 0, longitude: 0, polygon: null },
    ]);
    const zip = await JSZip.loadAsync(buffer);
    const kml = await zip.file('doc.kml')!.async('string');
    expect(kml).toContain('A &amp; B &lt;test&gt;');
  });
});
