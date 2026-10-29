import type { StudentInput } from '../types';

/** Splits a single CSV line, honouring quoted fields and escaped quotes. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export interface CsvImportResult {
  students: StudentInput[];
  /** Rows that were skipped, with the reason, so the user can fix the file. */
  skipped: { line: number; reason: string }[];
}

/**
 * Parses the student CSV described in the import dialog:
 * รหัสนักศึกษา, คำนำหน้าชื่อ, ชื่อ-นามสกุล, เพศ, สาขาวิชา, เบอร์โทรศัพท์, อีเมล, ไอดี LINE, Uid LINE
 *
 * A header row is optional — it is detected and skipped when the first cell is
 * not numeric. Rows missing a student id or a name are reported rather than
 * silently imported as blanks.
 */
export function parseStudentCsv(text: string): CsvImportResult {
  // Strip the UTF-8 BOM Excel writes, or the first column name won't match.
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter((line) => line.trim());

  const students: StudentInput[] = [];
  const skipped: { line: number; reason: string }[] = [];

  lines.forEach((line, index) => {
    const cells = splitLine(line);

    // Header detection: the first data column is always a numeric student id.
    if (index === 0 && !/^\d/.test(cells[0] ?? '')) return;

    const [studentId, prefix, firstLast, gender, major, phone, email, lineId, lineUid] = cells;

    if (!studentId?.trim() || !firstLast?.trim()) {
      skipped.push({ line: index + 1, reason: 'ไม่มีรหัสนักศึกษาหรือชื่อ-นามสกุล' });
      return;
    }

    students.push({
      studentId: studentId.trim(),
      prefix: prefix?.trim() || 'นาย',
      firstLast: firstLast.trim(),
      gender: gender?.trim() || 'ชาย',
      major: major?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      lineId: lineId?.trim() || '',
      lineUid: lineUid?.trim() || '',
    });
  });

  return { students, skipped };
}
