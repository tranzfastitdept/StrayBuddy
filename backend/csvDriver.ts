// backend/csvDriver.ts
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'backend', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(table: string): string {
  return path.join(DATA_DIR, `${table}.csv`);
}

/**
 * Basic CSV Row Parser handling double quotes and escaped quotes
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Basic CSV Row Formatter
 */
export function formatCSVLine(values: any[]): string {
  return values
    .map((val) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',');
}

/**
 * Read all rows from CSV as Array of Objects
 */
export function readCSVTable<T = any>(table: string): T[] {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
  if (!fileContent) return [];

  const lines = fileContent.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, index) => {
      let val: any = values[index] ?? '';
      // Parse JSON strings or booleans/numbers if applicable
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch {
          // keep as string
        }
      }
      row[header] = val;
    });

    rows.push(row as T);
  }

  return rows;
}

/**
 * Write all rows back to CSV table
 */
export function writeCSVTable(table: string, rows: Record<string, any>[]): void {
  const filePath = getFilePath(table);
  if (rows.length === 0) {
    if (fs.existsSync(filePath)) {
      const headerLine = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)[0];
      fs.writeFileSync(filePath, `${headerLine}\n`, 'utf-8');
    }
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map((h) => row[h]);
    lines.push(formatCSVLine(values));
  }

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf-8');
}

/**
 * Append a single row to CSV
 */
export function appendCSVRow(table: string, row: Record<string, any>): void {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    writeCSVTable(table, [row]);
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
  const headers = parseCSVLine(fileContent.split(/\r?\n/)[0]);
  const values = headers.map((h) => row[h] ?? '');
  const line = formatCSVLine(values);

  fs.appendFileSync(filePath, `${line}\n`, 'utf-8');
}
