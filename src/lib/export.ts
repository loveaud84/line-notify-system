/**
 * Spreadsheet export for the report pages.
 *
 * Writes CSV rather than a real .xlsx binary, which keeps the project free of a
 * spreadsheet dependency. The UTF-8 byte-order mark is the important part:
 * without it Excel on Windows reads the file as the system codepage and every
 * Thai character turns to mojibake.
 */

function escapeCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Guard against a leading =, +, - or @ being run as a formula on open.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadSpreadsheet(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  const csv = '﻿' + lines.join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Timestamp suffix for export filenames, e.g. "20260824-1405". */
export function exportStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}
