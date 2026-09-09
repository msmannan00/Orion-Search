import entitiesData from '../../../assets/data/entities_data/entities.json';
import { IocCategory } from '../model/tenant/tenant.model';
import type { EntityDefinition, ParsedIocCsv } from './model/ioc-csv.model';
import { getOwnProperty, setOwnProperty } from './type-guards.util';

export type { EntityDefinition, ParsedIocCsv } from './model/ioc-csv.model';






const CSV_HEADERS = ['key', 'value'];
const TEMPLATE_INSTRUCTION_KEY = 'Instruction';
const TEMPLATE_INSTRUCTION_TEXT = 'For 2 or more values of the same key, copy the key into another row and add the next value.';
export const IOC_CSV_MAX_FILE_SIZE_BYTES = 1024 * 1024;

const entityDefinitions = (entitiesData as EntityDefinition[]).filter(entity => !!entity.key);
const entityByKey = new Map(entityDefinitions.map(entity => [entity.key, entity]));

export function getIocEntityTitle(key: string): string {
  return entityByKey.get(key)?.title ?? key;
}

export function parseIocCsv(content: string): ParsedIocCsv {
  const rows = parseCsvRows(content).filter(row => {
    const firstCell = row[0]?.trim() ?? '';
    return row.some(cell => cell.trim()) && !firstCell.startsWith('#') && firstCell !== TEMPLATE_INSTRUCTION_KEY;
  });

  if (rows.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const header = rows[0].map(cell => cell.trim());
  if (header.length !== CSV_HEADERS.length || header[0] !== CSV_HEADERS[0] || header[1] !== CSV_HEADERS[1]) {
    throw new Error('CSV header must be exactly: key,value');
  }

  const valuesByKey: Record<string, string[]> = {};
  let valueCount = 0;

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (row.length !== CSV_HEADERS.length) {
      throw new Error(`Row ${rowNumber} must contain exactly two columns: key,value.`);
    }

    const key = row[0].trim();
    const value = row[1].trim();

    if (!key && !value) {
      return;
    }

    if (!value) {
      return;
    }

    if (!key) {
      throw new Error(`Row ${rowNumber} is missing an IOC key.`);
    }

    if (!entityByKey.has(key)) {
      throw new Error(`Row ${rowNumber} uses an invalid IOC key: ${key}.`);
    }

    setOwnProperty(valuesByKey, key, getOwnProperty(valuesByKey, key) ?? []);
    if (!getOwnProperty(valuesByKey, key).includes(value)) {
      getOwnProperty(valuesByKey, key).push(value);
      valueCount++;
    }
  });

  if (valueCount === 0) {
    throw new Error('CSV file does not contain any IOC values.');
  }

  return { valuesByKey, valueCount };
}

export function mergeIocCsvValues(iocs: IocCategory[], parsedCsv: ParsedIocCsv): number {
  let addedCount = 0;

  Object.entries(parsedCsv.valuesByKey).forEach(([key, values]) => {
    let category = iocs.find(ioc => ioc.ioc_id === key);
    if (!category) {
      category = {
        ioc_id: key,
        name: getIocEntityTitle(key),
        values: []
      };
      iocs.push(category);
    }

    values.forEach(value => {
      if (!category.values.includes(value)) {
        category.values.push(value);
        addedCount++;
      }
    });
  });

  return addedCount;
}

export function isCsvFile(file: File): boolean {
  const filename = file.name.toLowerCase();
  return filename.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
}

export function buildIocCsvTemplate(): string {
  const rows = [
    [TEMPLATE_INSTRUCTION_KEY, TEMPLATE_INSTRUCTION_TEXT],
    CSV_HEADERS,
    ...entityDefinitions.map(entity => [entity.key, ''])
  ];

  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
}

export function downloadIocCsvTemplate(): void {
  const blob = new Blob([buildIocCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ioc_upload_template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvRows(content: string): string[][] {
  const normalizedContent = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < normalizedContent.length; index++) {
    const char = getOwnProperty(normalizedContent, index);
    const nextChar = normalizedContent[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index++;
      }
      else if (char === '"') {
        inQuotes = false;
      }
      else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length > 0) {
        throw new Error('CSV contains an invalid quote.');
      }
      inQuotes = true;
    }
    else if (char === ',') {
      row.push(field);
      field = '';
    }
    else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    }
    else if (char === '\r') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (nextChar === '\n') {
        index++;
      }
    }
    else {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error('CSV contains an unclosed quoted value.');
  }

  row.push(field);
  rows.push(row);
  return rows;
}

function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}
