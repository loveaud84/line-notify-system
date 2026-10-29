export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const THAI_MONTH_ABBREVS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_WEEKDAY_INITIALS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** Converts a Gregorian year to the Buddhist era used throughout the UI. */
export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}

/** "2569-07-20" -> "20 กรกฎาคม 2569". Returns '' for anything unparseable. */
export function formatThaiDate(isoDate: string): string {
  const parts = (isoDate ?? '').split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  const monthName = THAI_MONTHS[Number(m) - 1];
  if (!monthName) return '';
  return `${Number(d)} ${monthName} ${toBuddhistYear(Number(y))}`;
}

/** Timestamp in the short form the history log stores, e.g. "24 ส.ค. 14:05". */
export function formatThaiTimestamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${THAI_MONTH_ABBREVS[date.getMonth()]} ${hh}:${mm}`;
}

/**
 * Short label for a stored send timestamp, e.g. "24 ส.ค. 14:05".
 *
 * The database keeps a real instant, so unlike the original design there is no
 * ambiguity about which year a history row belongs to.
 */
export function formatThaiShort(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return '—';
  return formatThaiTimestamp(date);
}

/** True when two instants fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
